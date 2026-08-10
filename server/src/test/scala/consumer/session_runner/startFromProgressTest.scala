package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import zio.test.*

import java.util.concurrent.atomic.AtomicLong
import scala.jdk.CollectionConverters.*

/** Progress reporting for a start-from position that has to be reached by COUNTING.
  *
  * "Skip the first n messages" is O(n) - Pulsar keeps no message-ordinal index, so the only exact
  * way to land on message n is to stream n messages and throw them away. n is a number the user
  * typed and is deliberately uncapped, so a session can spend a long time delivering nothing at all.
  * Without a report the UI cannot tell that from a hung session.
  *
  * The awkward part is that a discarded message never reaches the delivery path - the listener drops
  * it before the message handler - so nothing on the normal response path fires while the skip is in
  * flight. The report therefore has to be pushed from the discard itself, and throttled, because one
  * gRPC frame per skipped message would be millions of frames.
  */
object startFromProgressTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/progress"
    private val otherTopicFqn = "persistent://public/default/progress-other"

    private final class RecordingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val responses = java.util.concurrent.ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        override def onNext(value: consumerPb.ResumeResponse): Unit = responses.add(value)
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = ()
        def received: Vector[consumerPb.ResumeResponse] = responses.asScala.toVector
        def progressReports: Vector[(Long, Long, Boolean)] =
            received.flatMap(_.consumerStats).flatMap(_.startFromProgress).map(p => (p.messagesSkipped, p.messagesToSkip, p.complete))

    /** A listener already open for business. It starts CLOSED in production - nothing may be
      * consumed before the session is armed and a client has resumed it - and
      * `ConsumerSessionTargetRunner.resume` is what opens it. */
    private def listener(): ConsumerListener =
        val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        l.startAcceptingNewMessages()
        l

    private def targetConfig(topicFqns: Vector[String]): ConsumerSessionTarget =
        ConsumerSessionTarget(
            isEnabled = true,
            consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
            messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
            topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = topicFqns)),
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )

    private def targetRunner(consumerListener: ConsumerListener, topicFqns: Vector[String] = Vector(topicFqn)): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = targetConfig(topicFqns),
            nonPartitionedTopicFqns = topicFqns,
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = Map.empty,
            pauseArbiters = Map.empty,
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(targets: (Int, ConsumerSessionTargetRunner)*): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = "cs-progress",
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            sessionContextPool = ConsumerSessionContextPool(),
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = targets.toMap
        )

    private def progressOf(runner: ConsumerSessionRunner): Option[(Long, Long, Boolean)] =
        runner.startFromProgress.map(p => (p.messagesSkipped, p.messagesToSkip, p.complete))

    private val totalSuite = suite("what the discard was armed with")(
        test("a shared discard remembers its total after the counter has been spent") {
            // messagesToSkip is the number the user asked for; reading it off the live counter
            // would report a total that shrinks to zero as the skip progresses.
            val discard = StartFromDiscard.shared(5)
            discard.claim(topicFqn)
            discard.claim(topicFqn)
            assertTrue(discard.total == 5L, discard.remaining == 3L)
        },
        test("a per-topic discard totals every topic it covers") {
            val discard = StartFromDiscard.perTopic(Map(topicFqn -> 2L, otherTopicFqn -> 3L))
            discard.claim(topicFqn)
            assertTrue(discard.total == 5L, discard.remaining == 4L)
        },
        test("the empty discard has nothing to skip") {
            assertTrue(StartFromDiscard.none.total == 0L)
        },
        test("a negative arming is clamped in the total too") {
            // DEFENCE IN DEPTH, and no longer reachable from a request: a negative count is now
            // REFUSED at the trust boundary (see `startFromCountRejectionReason`) instead of being
            // clamped into a different valid position. This pins the counter's own behaviour so an
            // internal caller that ever armed one negative cannot produce a nonsense total.
            assertTrue(StartFromDiscard.shared(-7).total == 0L)
        }
    )

    private val throttleSuite = suite("how often a skip in flight is reported")(
        test("the very first skipped message is reported, so the UI learns the total immediately") {
            assertTrue(shouldReportStartFromProgress(skipped = 1, total = 1_000_000, reportEvery = 10_000))
        },
        test("the last skipped message is reported, so the UI sees the run complete") {
            assertTrue(shouldReportStartFromProgress(skipped = 1_000_000, total = 1_000_000, reportEvery = 10_000))
        },
        test("only every reportEvery-th message in between is reported") {
            val reported = (1L to 30_000L).filter(skipped => shouldReportStartFromProgress(skipped, total = 1_000_000, reportEvery = 10_000))
            assertTrue(reported == Vector(1L, 10_000L, 20_000L, 30_000L)) ??
                s"a skip of a million must not put a frame on the wire per message, got ${reported.size} reports"
        },
        test("a skip shorter than one interval still reports its start and its end") {
            val reported = (1L to 5L).filter(skipped => shouldReportStartFromProgress(skipped, total = 5, reportEvery = 10_000))
            assertTrue(reported == Vector(1L, 5L))
        },
        test("a count past the total still reports - a race between listener threads must not lose the end") {
            assertTrue(shouldReportStartFromProgress(skipped = 7, total = 5, reportEvery = 10_000))
        },
        test("nothing is reported for a session with nothing to skip") {
            assertTrue(
                !shouldReportStartFromProgress(skipped = 0, total = 0, reportEvery = 10_000),
                !shouldReportStartFromProgress(skipped = 1, total = 0, reportEvery = 10_000)
            )
        },
        test("a zero or negative interval degrades to first-and-last instead of dividing by zero") {
            val reported = (1L to 20L).filter(skipped => shouldReportStartFromProgress(skipped, total = 20, reportEvery = 0))
            assertTrue(reported == Vector(1L, 20L))
        },
        test("the production interval is coarse enough that a million-message skip is a trickle") {
            val reports = (1L to 1_000_000L).count(skipped => shouldReportStartFromProgress(skipped, 1_000_000, startFromProgressReportInterval))
            assertTrue(reports > 1, reports < 1000) ?? s"a 1,000,000 skip produced $reports progress frames"
        }
    )

    private val sessionProgressSuite = suite("what the session reports")(
        test("a session with no skip to do reports no progress at all") {
            // Earliest / Latest / date-time / message-id / approximate all seek exactly: there is
            // nothing to count, and a progress bar for them would be a lie.
            val runner = session(0 -> targetRunner(listener()))
            assertTrue(progressOf(runner).isEmpty)
        },
        test("a skip in flight reports the total and how much of it is actually done") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(10)
            val runner = session(0 -> targetRunner(l))
            val atStart = progressOf(runner)
            (1 to 4).foreach(_ => l.decide(topicFqn, canAcknowledge = true))
            assertTrue(atStart == Some((0L, 10L, false)), progressOf(runner) == Some((4L, 10L, false)))
        },
        test("progress completes exactly when the last message has been skipped") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            val runner = session(0 -> targetRunner(l))
            (1 to 2).foreach(_ => l.decide(topicFqn, canAcknowledge = true))
            val beforeLast = progressOf(runner)
            l.decide(topicFqn, canAcknowledge = true)
            val afterLast = progressOf(runner)
            l.decide(topicFqn, canAcknowledge = true) // now delivering normally
            assertTrue(beforeLast == Some((2L, 3L, false)), afterLast == Some((3L, 3L, true)), progressOf(runner) == Some((3L, 3L, true)))
        },
        test("a shared counter across two targets is counted once, not twice") {
            // Both targets hold the SAME counter; summing per target would report 20 to skip.
            val shared = StartFromDiscard.shared(10)
            val first = listener()
            val second = listener()
            first.startFromDiscard = shared
            second.startFromDiscard = shared
            val runner = session(0 -> targetRunner(first), 1 -> targetRunner(second))
            first.decide(topicFqn, canAcknowledge = true)
            second.decide(topicFqn, canAcknowledge = true)
            assertTrue(progressOf(runner) == Some((2L, 10L, false)))
        },
        test("a LATEST-N seek correction is not user-facing progress") {
            // The per-topic counter of a "latest n" is INTERNAL: the seek can only land on an entry
            // boundary, so each topic over-fetches and drops its own overshoot. That is the session
            // reaching the position the user asked for, not the user's own skip - and the proto
            // says so ("Only NthMessageAfterEarliest needs this"). Reporting it told a client that
            // asked for the last 5 messages that it was "skipping 95 messages".
            val first = listener()
            val second = listener()
            first.startFromDiscard = StartFromDiscard.perTopic(Map(topicFqn -> 3L))
            second.startFromDiscard = StartFromDiscard.perTopic(Map(otherTopicFqn -> 2L))
            val runner = session(0 -> targetRunner(first), 1 -> targetRunner(second, Vector(otherTopicFqn)))
            first.decide(topicFqn, canAcknowledge = true)
            assertTrue(progressOf(runner).isEmpty) ??
                s"a latest-n overshoot was reported to the client as a skip: ${progressOf(runner)}"
        },
        test("the latest-n correction still HAPPENS, it is just not reported") {
            // The counter must keep dropping the overshoot - only its visibility changed.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.perTopic(Map(topicFqn -> 2L))
            session(0 -> targetRunner(l))
            val actions = (1 to 4).map(_ => l.decide(topicFqn, canAcknowledge = true))
            assertTrue(actions.count(_ == ConsumerListener.Action.Drop) == 2, l.startFromDiscard.remaining == 0L)
        },
        test("an ORDERING layer does not mask the latest-n overshoot from the effective counter") {
            // "Latest n" + a delivery order (the DEFAULT) arms BOTH a per-topic overshoot counter
            // on the listener AND an ordering-only layer whose own budget is a shared ZERO. The
            // ordering layer does no dropping, so the zero must not shadow the listener's counter:
            // `remainingStartFromDiscard` is what suppresses the rate limiter's permit hold while
            // the overshoot is still being dropped, and reporting 0 there un-suppressed it in
            // exactly the window the suppression protects.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.perTopic(Map(topicFqn -> 3L))
            l.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.Ordered(
                    // Best effort carries EMPTY recorded ends - the continuous rules need none.
                    Vector(
                        StartFromStream(startFromStreamId("cs-progress-0", topicFqn), EntryPosition.empty),
                        StartFromStream(startFromStreamId("cs-progress-0", otherTopicFqn), EntryPosition.empty)
                    ),
                    _root_.consumer.session_config.MessageDeliveryOrder.BestEffort
                )
            )
            val runner = session(0 -> targetRunner(l))

            val atStart = runner.remainingStartFromDiscard
            l.decide(topicFqn, canAcknowledge = true)

            assertTrue(
                atStart == 3L,
                runner.remainingStartFromDiscard == 2L,
                // Still NOT user-facing progress: the overshoot is internal, whatever carries it.
                progressOf(runner).isEmpty
            ) ?? s"atStart=$atStart remaining=${runner.remainingStartFromDiscard} progress=${progressOf(runner)}"
        },
        test("a MERGE-owned skip budget still answers through the effective counter") {
            // The control for the fix above: when the ordering layer DOES own the budget (a
            // multi-stream skip-n), its counter is the one doing the dropping and must keep
            // being the one reported.
            val l = listener()
            l.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.GlobalSkip(
                    4,
                    Vector(
                        StartFromStream(startFromStreamId("cs-progress-0", topicFqn), EntryPosition(1L, 9L, -1, 1)),
                        StartFromStream(startFromStreamId("cs-progress-0", otherTopicFqn), EntryPosition(1L, 9L, -1, 1))
                    )
                )
            )
            val runner = session(0 -> targetRunner(l))
            assertTrue(runner.remainingStartFromDiscard == 4L)
        },
        test("a SKIP-N counter is user-facing progress and is still reported") {
            // The control: the same machinery, armed by "skip the first n", is exactly what the
            // progress API exists for.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(4)
            val runner = session(0 -> targetRunner(l))
            l.decide(topicFqn, canAcknowledge = true)
            assertTrue(progressOf(runner) == Some((1L, 4L, false)))
        },
        test("a message rejected while paused does not count as skipped") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(4)
            val target = targetRunner(l)
            val runner = session(0 -> target)
            l.decide(topicFqn, canAcknowledge = true)
            target.pause()
            (1 to 5).foreach(_ => l.decide(topicFqn, canAcknowledge = true))
            assertTrue(progressOf(runner) == Some((1L, 4L, false)))
        }
    )

    private val responseSuite = suite("what goes on the wire")(
        test("a response carrying messages also carries the progress") {
            val progress = consumerPb.StartFromProgress(messagesSkipped = 7, messagesToSkip = 9, complete = false)
            val response = resumeResponse(Seq(consumerPb.Message(numMessageProcessed = 3)), Vector.empty, Some(progress))
            assertTrue(
                response.consumerStats.flatMap(_.startFromProgress) == Some(progress),
                response.messages.size == 1
            )
        },
        test("a response for a session with nothing to skip carries no stats at all") {
            val response = resumeResponse(Seq(consumerPb.Message()), Vector.empty, None)
            assertTrue(response.consumerStats.isEmpty)
        },
        test("errors still decide the status, whether or not progress is attached") {
            val withErrors = resumeResponse(Seq.empty, Vector("boom", "bang"), None)
            val withoutErrors = resumeResponse(Seq.empty, Vector.empty, None)
            assertTrue(
                withErrors.getStatus.code == com.google.rpc.code.Code.UNKNOWN.value,
                withErrors.getStatus.message.contains("boom") && withErrors.getStatus.message.contains("bang"),
                withoutErrors.getStatus.code == com.google.rpc.code.Code.OK.value
            )
        },
        test("a delivered message carries the completed progress, so the client clears its panel") {
            // The client hides its progress panel on `complete` or on an absent field. If the
            // responses that resume normal delivery dropped the stats, the panel would be left on
            // screen for the rest of the session.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(2)
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()
            // Wired like production: sendResponse now refuses an observer that is not the
            // session's current play stream, so the shape test resumes first.
            runner.resume(observer, isDebug = false)
            (1 to 2).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            runner.sendResponse(observer, Seq(consumerPb.Message(numMessageProcessed = 5)), Vector.empty)

            // The resumed listener also pushes real in-flight progress frames as the drops land;
            // the pinned claim is about the DELIVERED message's frame - the last one out.
            assertTrue(
                observer.progressReports.last == (2L, 2L, true),
                observer.received.last.messages.size == 1
            )
        },
        test("a delivered message on a session that skipped nothing carries no stats at all") {
            val runner = session(0 -> targetRunner(listener()))
            val observer = RecordingObserver()
            runner.resume(observer, isDebug = false)

            runner.sendResponse(observer, Seq(consumerPb.Message()), Vector.empty)

            assertTrue(observer.received.size == 1, observer.received.head.consumerStats.isEmpty)
        },
        test("delivery never begins while the skip is still reported as in flight") {
            // The invariant the client's "clear on complete" rule depends on: the first message that
            // is NOT dropped must already see a completed progress, never a stale in-flight one.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            val runner = session(0 -> targetRunner(l))

            val atDelivery = (1 to 6).map(_ => (l.decide(topicFqn, canAcknowledge = true), progressOf(runner))).collect {
                case (ConsumerListener.Action.Deliver, progress) => progress
            }

            assertTrue(atDelivery.size == 3, atDelivery.forall(_.exists((_, _, complete) => complete))) ??
                s"a message was delivered while the skip still claimed to be running: $atDelivery"
        },
        test("a progress-only push is an OK, message-less response") {
            // The client reads the trailing message's counters only when a message is present, so a
            // message-less progress frame must not pretend to carry one.
            val response = resumeResponse(Seq.empty, Vector.empty, Some(consumerPb.StartFromProgress(messagesSkipped = 1, messagesToSkip = 9)))
            assertTrue(
                response.messages.isEmpty,
                response.getStatus.code == com.google.rpc.code.Code.OK.value,
                response.consumerStats.flatMap(_.startFromProgress).map(_.messagesSkipped) == Some(1L)
            )
        }
    )

    private val pushSuite = suite("pushing progress while nothing is being delivered")(
        test("a skip in flight pushes progress to the client although no message is delivered") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()

            runner.resume(observer, isDebug = false)
            (1 to 3).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(observer.progressReports == Vector((1L, 3L, false), (3L, 3L, true))) ??
                s"expected a first and a completing report, got ${observer.progressReports}"
        },
        test("a long skip is reported periodically, not per message") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(25_000)
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()

            runner.resume(observer, isDebug = false)
            (1 to 25_000).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(
                observer.progressReports.head == (1L, 25_000L, false),
                observer.progressReports.last == (25_000L, 25_000L, true),
                observer.progressReports.size == 4 // 1, 10_000, 20_000, 25_000
            ) ?? s"got ${observer.progressReports}"
        },
        test("a session with nothing to skip pushes nothing") {
            val l = listener()
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()

            runner.resume(observer, isDebug = false)
            (1 to 100).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(observer.received.isEmpty)
        },
        test("nothing is pushed before the session is resumed") {
            // The listener is armed at session creation, long before any client is listening.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            session(0 -> targetRunner(l))
            val dropped = (1 to 3).map(_ => l.decide(topicFqn, canAcknowledge = true))
            assertTrue(dropped.forall(_ == ConsumerListener.Action.Drop))
        },
        test("a client that did NOT ask for consumer stats is sent none") {
            // `ResumeRequest.include_consumer_stats` is the client saying whether it wants them.
            // It was read off the request and then dropped on the floor, so every client got the
            // stats - and, worse, got message-LESS progress frames it never asked to handle.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()

            runner.resume(observer, isDebug = false, includeConsumerStats = false)
            (1 to 3).foreach(_ => l.decide(topicFqn, canAcknowledge = true))
            runner.sendResponse(observer, Seq(consumerPb.Message(numMessageProcessed = 1)), Vector.empty)

            assertTrue(
                observer.received.size == 1,
                observer.received.head.consumerStats.isEmpty
            ) ?? s"a client that asked for no stats received ${observer.received.size} responses: ${observer.progressReports}"
        },
        test("a client that DID ask for consumer stats still gets them") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()

            runner.resume(observer, isDebug = false, includeConsumerStats = true)
            (1 to 3).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(observer.progressReports == Vector((1L, 3L, false), (3L, 3L, true)))
        },
        test("resuming again keeps reporting to the NEW client without re-arming the skip") {
            // Pause/resume must not skip a fresh batch - and the second client must still see where
            // the skip got to.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(4)
            val target = targetRunner(l)
            val runner = session(0 -> target)
            val first = RecordingObserver()
            val second = RecordingObserver()

            runner.resume(first, isDebug = false)
            l.decide(topicFqn, canAcknowledge = true)
            runner.pause()
            runner.resume(second, isDebug = false)
            val afterResume = (1 to 5).map(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(
                first.progressReports == Vector((1L, 4L, false)),
                second.progressReports == Vector((4L, 4L, true)),
                afterResume.count(_ == ConsumerListener.Action.Drop) == 3,
                l.startFromDiscard.remaining == 0L
            ) ?? s"first=${first.progressReports} second=${second.progressReports} actions=$afterResume"
        }
    ) @@ TestAspect.sequential

    private val stallDisclosureSuite = suite("disclosing a stalled delivery order with no counted skip")(
        test("a GUARANTEED stall pushes the waiting-streams disclosure although nothing is skipped or delivered") {
            // H2's exact shape: an ordering-ONLY session (no skip-n) stalls under Guaranteed. Its
            // budget is a shared ZERO, so `startFromProgress` is None - and the old gate hung the
            // whole push on it, so no ResumeResponse was ever written: the session sat in state
            // `running`, indistinguishable from an empty topic. The stall must reach the client
            // through the same stats channel every response carries, throttled to one message-less
            // frame per NEW stall warning - never a frame per held message or per sweep tick.
            //
            // The full production path is driven: a real GuaranteedOnly merge with an injected
            // clock, the real listener sweep, the real runner closure, a recording observer. The
            // runner is PAUSED after resume so the background sweep timer and the delivery pump
            // stay out of the way - the sweep is driven by hand, deterministically.
            val clock = new AtomicLong(0L)
            val streamA = startFromStreamId("cs-progress-0", topicFqn)
            val streamB = startFromStreamId("cs-progress-0", otherTopicFqn)
            val merge = GlobalSkipMerge[HeldMessage](
                streamIds = Vector(streamA, streamB),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => clock.get,
                policy = OrderingPolicy.GuaranteedOnly
            )
            val l = listener()
            // MID-REPLAY streams: far-future recorded ends, so nothing offered here reads as
            // finished - the stall being disclosed is a stream that still owes its recorded
            // range. (Empty ends would mean "nothing to replay", which since the exact-replay
            // redesign finishes the stream instead of waiting on it.)
            l.startFromOrdering = new StartFromOrdering[HeldMessage](
                Some(merge),
                Map(
                    streamA -> StartFromStream(streamA, EntryPosition(1L, 1_000_000L, -1, 1)),
                    streamB -> StartFromStream(streamB, EntryPosition(1L, 1_000_000L, -1, 1))
                )
            )
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()
            runner.resume(observer, isDebug = false)
            // Cancels the real 250ms sweep timer and pauses the drain - which also short-circuits
            // the guaranteed pump's pacing check, so the held payloads below are never dereferenced.
            runner.pause()

            // Stream a speaks; b stays silent. Guaranteed holds a-100 and waits on b, forever.
            var nextEntryId = 0L
            def offer(streamFqn: String, orderTime: Long): Unit =
                nextEntryId += 1
                l.startFromOrdering.offer(
                    consumerName = "cs-progress-0",
                    topicFqn = streamFqn,
                    orderTime = orderTime,
                    messageId = new org.apache.pulsar.client.impl.MessageIdImpl(1L, nextEntryId, -1),
                    // Never delivered in this test (the pump is short-circuited by the paused
                    // drain), so the payload's consumer and message are never touched.
                    payload = HeldMessage(null, null, l)
                )
                ()
            offer(topicFqn, 100L)
            l.sweepStartFromStall() // stamps the blind clock; the warning window has not passed
            val beforeWarning = observer.received.size

            clock.set(startFromMergeStallWarnMs + 1)
            l.sweepStartFromStall() // crosses the warn window: the disclosure must go out NOW
            val atFirstWarning = observer.received.size
            // The server-side diagnostic knows WHICH stream is waited on; the wire carries only
            // the count (there is no per-stream proto field).
            val stalledIds = l.startFromOrdering.stalledStreamIds
            l.sweepStartFromStall() // still stalled, no NEW warning: the throttle holds the line
            // A drop-path report while the SAME stall persists (what every latest-n overshoot drop
            // fires) must not re-push either - the disclosure is once per NEW warning, wherever
            // the report comes from.
            l.onStartFromDiscardProgress()
            val afterQuietSweep = observer.received.size

            // b finally speaks: the stall resolves...
            offer(otherTopicFqn, 50L)
            val waitingAfterRecovery = l.startFromOrdering.stalledStreamCount
            // ...its head is consumed (by hand, through the barrier - no delivery machinery)...
            l.startFromOrdering.inOrder {
                l.startFromOrdering.peekGuaranteed()
                l.startFromOrdering.commitGuaranteed()
            }
            // ...and b is silent again: a FRESH stall must disclose again, exactly once.
            l.sweepStartFromStall() // stamps the new blind clock
            clock.addAndGet(startFromMergeStallWarnMs + 1)
            l.sweepStartFromStall()

            val frames = observer.received
            assertTrue(
                beforeWarning == 0,
                atFirstWarning == 1,
                stalledIds == Vector(streamB),
                afterQuietSweep == 1,
                waitingAfterRecovery == 0,
                frames.size == 2,
                frames.forall(_.messages.isEmpty),
                frames.forall(_.consumerStats.exists(stats =>
                    stats.deliveryOrderWaitingStreams == 1 && stats.deliveryOrderActive && stats.startFromProgress.isEmpty
                ))
            ) ?? (s"beforeWarning=$beforeWarning atFirstWarning=$atFirstWarning afterQuietSweep=$afterQuietSweep " +
                s"frames=${frames.map(f => (f.messages.size, f.consumerStats))}")
        },
        test("a client that asked for no stats is not sent the stall disclosure frame") {
            val clock = new AtomicLong(0L)
            val streamA = startFromStreamId("cs-progress-0", topicFqn)
            val streamB = startFromStreamId("cs-progress-0", otherTopicFqn)
            val merge = GlobalSkipMerge[HeldMessage](
                streamIds = Vector(streamA, streamB),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => clock.get,
                policy = OrderingPolicy.GuaranteedOnly
            )
            val l = listener()
            // Mid-replay shape, exactly as the disclosure test above: far-future recorded ends.
            l.startFromOrdering = new StartFromOrdering[HeldMessage](
                Some(merge),
                Map(
                    streamA -> StartFromStream(streamA, EntryPosition(1L, 1_000_000L, -1, 1)),
                    streamB -> StartFromStream(streamB, EntryPosition(1L, 1_000_000L, -1, 1))
                )
            )
            val runner = session(0 -> targetRunner(l))
            val observer = RecordingObserver()
            runner.resume(observer, isDebug = false, includeConsumerStats = false)
            runner.pause()

            l.startFromOrdering.offer("cs-progress-0", topicFqn, 100L, new org.apache.pulsar.client.impl.MessageIdImpl(1L, 1L, -1), HeldMessage(null, null, l))
            l.sweepStartFromStall()
            clock.set(startFromMergeStallWarnMs + 1)
            l.sweepStartFromStall()

            assertTrue(observer.received.isEmpty) ??
                s"a stats-less client received ${observer.received.size} stall frames"
        },
        test("the stall diagnostic classifies empty-forever, drained-to-end, and lagging streams") {
            // The debug log's classification is pure so it is pinned without a broker: a stream
            // with nothing ever published, a stream the session has read to its end, and a stream
            // that verifiably holds messages the session has not received yet must each read
            // differently - the last is the case the guarantee exists for.
            val end = EntryPosition(1L, 10L, -1, 1)
            assertTrue(
                stalledStreamEmptinessNote(None, None).contains("could not be read"),
                stalledStreamEmptinessNote(Some(EntryPosition.empty), None).contains("no message has ever been published"),
                stalledStreamEmptinessNote(Some(end), Some(EntryPosition(1L, 10L, -1, 1))).contains("waiting for a NEW message"),
                stalledStreamEmptinessNote(Some(end), Some(EntryPosition(1L, 4L, -1, 1))).contains("delivery lag"),
                stalledStreamEmptinessNote(Some(end), None).contains("delivery lag")
            )
        }
    ) @@ TestAspect.sequential

    def spec = suite(this.getClass.toString)(totalSuite, throttleSuite, sessionProgressSuite, responseSuite, pushSuite, stallDisclosureSuite)
