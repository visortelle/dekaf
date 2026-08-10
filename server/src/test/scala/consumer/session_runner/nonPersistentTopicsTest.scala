package consumer.session_runner

import _root_.consumer.start_from.*
import zio.test.*

import java.time.Instant

/** Start-from on NON-PERSISTENT topics.
  *
  * A non-persistent topic stores nothing: no backlog, no history, no entry to address. Every
  * history-based position is therefore unsatisfiable on one, and the broker says so - `examineMessage`
  * answers HTTP 405 ("Examine messages on a non-persistent topic is not allowed").
  *
  * That 405 used to be swallowed: the admin call sits inside a `Try(...).toOption`, so the refusal
  * became a `None` and the session quietly fell back to seeking earliest or latest. The user asked
  * for a position in history and silently got a different one - the worst kind of failure, because
  * the session looks like it worked.
  *
  * So the decision is made from the topic FQN, BEFORE any consumer is seeked, and it is a validation
  * error rather than an incidental exception. Everything here is pure: the rule is a function of the
  * mode and the resolved topic names.
  */
object nonPersistentTopicsTest extends ZIOSpecDefault:

    private val persistentTopic = "persistent://public/default/orders"
    private val nonPersistentTopic = "non-persistent://public/default/telemetry"
    private val nonPersistentPartition = "non-persistent://public/default/telemetry-partition-3"

    private val historyModes: Vector[ConsumerSessionStartFrom] = Vector(
        EarliestMessage(),
        NthMessageAfterEarliest(n = 10),
        NthMessageBeforeLatest(n = 10),
        MessageId(messageIdBytes = Array[Byte](8, 1)),
        DateTime(dateTime = Instant.ofEpochSecond(1_700_000_000L)),
        RelativeDateTime(value = 1, unit = DateTimeUnit.Hour, isRoundedToUnitStart = false),
        ApproximateEntryPosition(fraction = 0.5),
        ApproximatePublishTimePosition(fraction = 0.5)
    )

    private val detectionSuite = suite("detecting a topic with no history")(
        test("a non-persistent topic is recognised by its scheme, without asking the broker") {
            assertTrue(
                isNonPersistentTopic(nonPersistentTopic),
                isNonPersistentTopic(nonPersistentPartition)
            )
        },
        test("a persistent topic is not mistaken for one") {
            assertTrue(
                !isNonPersistentTopic(persistentTopic),
                !isNonPersistentTopic("persistent://public/default/orders-partition-0"),
                // The substring appears inside the name, not as the scheme.
                !isNonPersistentTopic("persistent://public/default/non-persistent-audit")
            )
        },
        test("an unqualified name is treated as persistent rather than silently rejected") {
            // Rejecting a session is the loud outcome, so it must never be triggered by a name shape
            // this function did not expect.
            assertTrue(!isNonPersistentTopic("public/default/orders"), !isNonPersistentTopic(""))
        }
    )

    private val modeSuite = suite("which modes need a history")(
        test("every mode except 'latest message' needs a retained history") {
            val wrong = historyModes.filterNot(startFromNeedsRetainedHistory)
            assertTrue(wrong.isEmpty) ?? s"these modes cannot work without a backlog but claim they can: $wrong"
        },
        test("'earliest message' counts as needing a history, although a seek to it would 'work'") {
            // On a non-persistent topic a seek to earliest silently behaves as "from now". Accepting
            // it would mean answering a request for the start of the topic with the live tail.
            assertTrue(startFromNeedsRetainedHistory(EarliestMessage()))
        },
        test("'latest message' is the one position a non-persistent topic can honour") {
            assertTrue(!startFromNeedsRetainedHistory(LatestMessage()))
        }
    )

    private val rejectionSuite = suite("rejecting what cannot work")(
        test("a history position over only non-persistent topics is rejected, naming the mode and the reason") {
            val reasons = historyModes.map(mode => mode -> startFromRejectionReason(mode, Vector(nonPersistentTopic)))
            val accepted = reasons.collect { case (mode, None) => mode }
            val unclear = reasons.collect {
                case (mode, Some(reason)) if !reason.contains("non-persistent") || !reason.contains(mode.getClass.getSimpleName) => mode -> reason
            }
            assertTrue(accepted.isEmpty, unclear.isEmpty) ??
                s"silently accepted: $accepted; rejected without a clear reason: $unclear"
        },
        test("the reason names the topics that caused it") {
            val reason = startFromRejectionReason(EarliestMessage(), Vector(nonPersistentTopic))
            assertTrue(reason.exists(_.contains(nonPersistentTopic)))
        },
        test("'latest message' is accepted on non-persistent topics") {
            assertTrue(startFromRejectionReason(LatestMessage(), Vector(nonPersistentTopic, nonPersistentPartition)).isEmpty)
        },
        test("a mixed session is NOT rejected - one persistent topic is enough to have a history") {
            // Failing the whole session because one of its topics is non-persistent would make a
            // history position unusable on any session that happens to include a live topic.
            val stillAccepted = historyModes.filter(mode => startFromRejectionReason(mode, Vector(nonPersistentTopic, persistentTopic)).isEmpty)
            assertTrue(stillAccepted == historyModes) ??
                s"a mixed session must keep working; these were rejected: ${historyModes.diff(stillAccepted)}"
        },
        test("a session over persistent topics only is never rejected") {
            val rejected = historyModes.filter(mode => startFromRejectionReason(mode, Vector(persistentTopic)).isDefined)
            assertTrue(rejected.isEmpty)
        },
        test("a session that resolved to no topics at all is left to the emptiness check") {
            // ConsumerSessionRunner.make already rejects that, with a message about the target -
            // reporting it here as a non-persistent problem would be misleading.
            assertTrue(startFromRejectionReason(EarliestMessage(), Vector.empty).isEmpty)
        }
    )

    private val splitSuite = suite("what a mixed session does")(
        test("the history position applies to the persistent topics only") {
            val (history, liveOnly) = splitByRetainedHistory(Vector(persistentTopic, nonPersistentTopic, nonPersistentPartition), identity)
            assertTrue(history == Vector(persistentTopic), liveOnly == Vector(nonPersistentTopic, nonPersistentPartition))
        },
        test("the split is over the physical topic of each consumer, not the session's selector") {
            // A partitioned non-persistent topic resolves to one consumer per partition, and each
            // has to be recognised on its own.
            val consumers = Vector("a" -> persistentTopic, "b" -> nonPersistentPartition)
            val (history, liveOnly) = splitByRetainedHistory(consumers, _._2)
            assertTrue(history.map(_._1) == Vector("a"), liveOnly.map(_._1) == Vector("b"))
        },
        test("a session with no non-persistent topic keeps every consumer on the history path") {
            val (history, liveOnly) = splitByRetainedHistory(Vector(persistentTopic, persistentTopic), identity)
            assertTrue(history.size == 2, liveOnly.isEmpty)
        }
    )

    def spec = suite(this.getClass.toString)(detectionSuite, modeSuite, rejectionSuite, splitSuite)
