package consumer.session_runner

import java.util.concurrent.atomic.AtomicLong

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.TreatBytesAsJson
import _root_.consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTarget, BasicMessageFilterValueTarget}
import _root_.consumer.message_filter.{JsMessageFilter, MessageFilter, MessageFilterChain, MessageFilterChainMode}
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.value_projections.ValueProjectionList
import io.circe.parser.parse as parseJson
import org.apache.pulsar.client.api.{Consumer, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.{ConcurrentLinkedQueue, CountDownLatch}
import scala.jdk.CollectionConverters.*

/** One consumer session owns ONE GraalVM JS context, and every partition of every target is
  * delivered on its own Pulsar listener thread.
  *
  * A GraalVM context may MIGRATE between threads but may not be entered by two at once - the loser
  * gets "Multi threaded access requested by thread ... but is not allowed for language(s) js". And
  * the context is entered per DELIVERED MESSAGE whether or not the user configured any JS, because
  * `setCurrentMessage` is itself a JS call.
  *
  * Worse than the exception is the state hand-off it hides: `setCurrentMessage` writes the message
  * under test into a GLOBAL JS variable, and the filter chain, the coloring rules and the value
  * projections all read it back out afterwards. Two threads interleaving there evaluate one
  * message's filter against another message's contents - a silently wrong retained set, with no
  * exception anywhere.
  *
  * Everything here runs offline. `ConsumerSessionTargetRunner.resume` installs the REAL production
  * message handler and `ConsumerListener.received` is the REAL delivery path; only the broker is
  * replaced, by a proxy consumer and hand-built `MessageImpl`s.
  */
object sessionContextConcurrencyTest extends ZIOSpecDefault:

    private val consumerName = "cs-ctx-race-0"

    private def partitionFqn(i: Int): String = s"persistent://public/default/cs-ctx-race-partition-$i"

    /** Retains the even `n`s and nothing else - the oracle for the state hand-off.
      *
      * The filter reads `message.value` out of the shared context, so if another thread overwrote
      * the current message in between, THIS message is judged by THAT message's payload: an odd `n`
      * gets retained, or an even one dropped. Both show up as a wrong retained set.
      */
    private val evenOnly: MessageFilterChain =
        MessageFilterChain(
            isEnabled = true,
            isNegated = false,
            mode = MessageFilterChainMode.All,
            filters = Vector(
                MessageFilter(
                    isEnabled = true,
                    isNegated = false,
                    targetField = BasicMessageFilterTarget(target = BasicMessageFilterValueTarget()),
                    filter = JsMessageFilter(jsCode = "v => v.n % 2 === 0")
                )
            )
        )

    private def message(topicFqn: String, n: Int, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        // publish_time is mandatory on MessageMetadata - reading it when unset throws.
        md.setPublishTime(1_700_000_000_000L + n)
        md.setPartitionKey(n.toString)
        val msg = MessageImpl.create[Array[Byte]](
            md,
            ByteBuffer.wrap(s"""{"n":$n}""".getBytes("UTF-8")),
            Schema.BYTES,
            topicFqn
        )
        // serializeMessage reads msg.getMessageId.toByteArray; MessageImpl.create leaves it null.
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    /** The handful of things `ConsumerListener.received` asks a consumer.
      *
      * CONNECTED, and the acknowledgment is answered rather than short-circuited. This used to say
      * `isConnected = false` purely to skip the acknowledge without a broker, which stopped working
      * - and rightly so: a message the consumer cannot answer for is now handed straight back
      * instead of being decided, so a disconnected fixture delivers nothing at all and this suite
      * would have measured an empty session. A real delivering consumer is connected.
      */
    private def consumerOn(topicFqn: String): Consumer[Array[Byte]] =
        val handler = new InvocationHandler:
            override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                method.getName match
                    case "getTopic"         => topicFqn
                    case "getConsumerName"  => consumerName
                    case "isConnected"      => java.lang.Boolean.TRUE
                    case "acknowledgeAsync" => java.util.concurrent.CompletableFuture.completedFuture(null)
                    case "equals"           => java.lang.Boolean.valueOf(proxy eq args(0))
                    case "hashCode"         => java.lang.Integer.valueOf(topicFqn.hashCode)
                    case "toString"         => s"proxy-consumer($topicFqn)"
                    case _                  => null
        Proxy
            .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
            .asInstanceOf[Consumer[Array[Byte]]]

    private def targetRunner(
        filterChain: MessageFilterChain,
        topicFqns: Vector[String],
        pool: ConsumerSessionContextPool,
        listener: ConsumerListener
    ): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = TreatBytesAsJson()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = topicFqns)),
                messageFilterChain = filterChain,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = topicFqns,
            schemasByTopic = Map.empty,
            sessionContextPool = pool,
            consumers = Map.empty,
            consumerListener = listener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    /** What one concurrent delivery run produced. */
    private final case class Outcome(
        retained: Vector[Int],
        dropped: Int,
        jsErrors: Vector[String],
        escaped: Vector[String],
        consoleResults: Vector[String],
        finished: Boolean,
        // Production counters, read after the run. Both are incremented from the message handler
        // BEFORE the context lease, i.e. concurrently from every partition thread.
        processedByTarget: Long,
        processedBySession: Long
    )

    private def nOf(msg: ConsumerSessionMessage): Option[Int] =
        msg.messageValueAsJson.toOption
            .flatMap(json => parseJson(json).toOption)
            .flatMap(_.hcursor.downField("n").as[Int].toOption)

    /** `partitions` listener threads deliver `perPartition` messages each into ONE listener, exactly
      * as Pulsar does for a partitioned topic: one listener per target, one thread per partition.
      *
      * `consoleRounds > 0` additionally drives `ConsumerServiceImpl.runCode`'s path from a further
      * thread - the browser console evaluates in the SAME session context, off a gRPC thread.
      */
    private def deliverConcurrently(
        filterChain: MessageFilterChain,
        partitions: Int,
        perPartition: Int,
        consoleRounds: Int = 0
    ): Outcome =
        val topicFqns = Vector.tabulate(partitions)(partitionFqn)
        val pool = ConsumerSessionContextPool()
        val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        val runner = targetRunner(filterChain, topicFqns, pool, listener)

        // A REAL session, so `incrementNumMessageProcessed` below is the production method rather
        // than a stand-in - that counter is stamped onto every pb.Message the browser receives.
        val session = ConsumerSessionRunner(
            sessionName = "cs-ctx-race",
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            sessionContextPool = pool,
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> runner)
        )

        val retained = new ConcurrentLinkedQueue[Int]()
        val dropped = new AtomicInteger(0)
        val jsErrors = new ConcurrentLinkedQueue[String]()
        val escaped = new ConcurrentLinkedQueue[String]()
        val consoleResults = new ConcurrentLinkedQueue[String]()

        runner.resume(
            onNext = (msg, _, _, errors) =>
                errors.foreach(jsErrors.add)
                msg match
                    case Some(m) => nOf(m).foreach(retained.add)
                    case None    => dropped.incrementAndGet()
            ,
            isDebug = true,
            incrementNumMessageProcessed = () => session.incrementNumMessageProcessed(),
            onStartFromDiscardProgress = () => ()
        )

        val start = new CountDownLatch(1)

        def worker(name: String)(body: => Unit): Thread =
            val runnable: Runnable = () =>
                start.await()
                try body
                catch
                    case err: Throwable =>
                        escaped.add(s"${err.getClass.getSimpleName}: ${err.getMessage}")
                        ()
            val t = new Thread(runnable, name)
            t.setDaemon(true)
            t

        val deliverers = topicFqns.zipWithIndex.map { (topicFqn, p) =>
            worker(s"pulsar-listener-$p") {
                val consumer = consumerOn(topicFqn)
                var i = 0
                while i < perPartition do
                    // Caught PER MESSAGE, as Pulsar does: an exception out of `received` is logged by
                    // the consumer's listener executor and the next message is delivered anyway. So
                    // the run continues past a collision and the retained set stays assertable.
                    try
                        // Globally unique `n`, so odd and even are spread across every partition.
                        listener.received(consumer, message(topicFqn, i * partitions + p, i.toLong))
                    catch
                        case err: Throwable =>
                            escaped.add(s"${err.getClass.getSimpleName}: ${err.getMessage}")
                            ()
                    i += 1
            }
        }

        val consoles = Option.when(consoleRounds > 0) {
            worker("grpc-run-code") {
                var i = 0
                while i < consoleRounds do
                    // Exactly what ConsumerServiceImpl.runCode does with the session's pool.
                    consoleResults.add(pool.withContext(0)(_.runCode("1 + 1")))
                    i += 1
            }
        }.toVector

        val workers = deliverers ++ consoles
        workers.foreach(_.start())
        start.countDown()
        workers.foreach(_.join(120_000))

        Outcome(
            retained = retained.asScala.toVector,
            dropped = dropped.get,
            jsErrors = jsErrors.asScala.toVector,
            escaped = escaped.asScala.toVector,
            consoleResults = consoleResults.asScala.toVector,
            finished = workers.forall(!_.isAlive),
            processedByTarget = runner.stats.messageProcessed.get,
            processedBySession = session.numMessageProcessed
        )

    def spec = suite(this.getClass.toString)(
        test("concurrent partition listeners never collide in the session's JS context") {
            val partitions = 3
            val perPartition = 200
            val total = partitions * perPartition
            val outcome = deliverConcurrently(evenOnly, partitions, perPartition)
            val expected = (0 until total).filter(_ % 2 == 0).toVector

            assertTrue(
                outcome.finished,
                outcome.escaped.isEmpty,
                outcome.jsErrors.isEmpty,
                outcome.retained.sorted == expected,
                outcome.dropped == total - expected.size
            ) ?? (s"escaped=${outcome.escaped.take(3)} jsErrors=${outcome.jsErrors.take(3)} " +
                s"retained=${outcome.retained.size}/${expected.size} dropped=${outcome.dropped}/${total - expected.size} " +
                s"wronglyRetained=${outcome.retained.filter(_ % 2 != 0).take(5)}")
        },
        test("a session with NO user JS enters the context per message too") {
            // `setCurrentMessage` is a JS call, so the context is entered before any `isEnabled`
            // check - a session that configured no filter at all races just the same.
            val partitions = 4
            val perPartition = 150
            val total = partitions * perPartition
            val outcome = deliverConcurrently(MessageFilterChain.empty, partitions, perPartition)

            assertTrue(
                outcome.finished,
                outcome.escaped.isEmpty,
                outcome.retained.sorted == (0 until total).toVector,
                outcome.dropped == 0
            ) ?? s"escaped=${outcome.escaped.take(3)} retained=${outcome.retained.size}/$total dropped=${outcome.dropped}"
        },
        test("the browser console shares the session context with the listener threads") {
            // `ConsumerServiceImpl.runCode` evaluates in `getContext(0)` off a gRPC thread while the
            // listeners are inside the same context. `runCode` swallows what it catches, so a
            // collision here is not an exception - it is an "[ERROR] ..." handed to the user as the
            // answer to their expression.
            val partitions = 2
            val perPartition = 200
            val outcome = deliverConcurrently(evenOnly, partitions, perPartition, consoleRounds = 200)
            val badResults = outcome.consoleResults.filter(_ != "2")

            assertTrue(
                outcome.finished,
                outcome.escaped.isEmpty,
                outcome.consoleResults.size == 200,
                badResults.isEmpty
            ) ?? s"escaped=${outcome.escaped.take(3)} console=${badResults.take(3)} (${badResults.size} of ${outcome.consoleResults.size})"
        },
        test("the session's processed counter survives concurrent increment") {
            // The end-to-end test below asserts the counters are RIGHT, but it cannot prove they are
            // ATOMIC: the increments sit just before the JS lease, and the lock downstream throttles
            // arrivals, so threads almost never collide in that window. It passes either way.
            //
            // This one contends on the counter directly and does discriminate: with a plain
            // read-modify-write it loses updates well before the assertion.
            val session = ConsumerSessionRunner(
                sessionName = "cs-counter-race",
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
                targets = Map.empty
            )

            val threads = 8
            val perThread = 50000
            val start = new CountDownLatch(1)
            val workers = Vector.tabulate(threads) { i =>
                val r: Runnable = () =>
                    start.await()
                    var k = 0
                    while k < perThread do
                        session.incrementNumMessageProcessed()
                        k += 1
                val t = new Thread(r, s"pulsar-listener-counter-$i")
                t.start()
                t
            }
            start.countDown()
            workers.foreach(_.join(60000))

            val expected = (threads * perThread).toLong
            assertTrue(session.numMessageProcessed == expected) ??
                s"expected $expected, counted ${session.numMessageProcessed} (lost ${expected - session.numMessageProcessed})"
        },
        test("every delivered message is counted, on every partition thread") {
            // Both counters are incremented BEFORE the context lease, so they are the one part of
            // the handler that still runs fully concurrently - one listener thread per partition.
            // As plain `var Long`s the read-modify-write updates were lost and a partitioned session
            // under-reported, shipping the wrong number to the browser on every pb.Message.
            //
            // Counting is deliberately independent of filtering: `evenOnly` drops half the messages,
            // and both counters must still see ALL of them.
            val partitions = 4
            val perPartition = 250
            val total = partitions * perPartition
            val outcome = deliverConcurrently(evenOnly, partitions, perPartition)

            assertTrue(
                outcome.finished,
                outcome.processedByTarget == total.toLong,
                outcome.processedBySession == total.toLong
            ) ?? (s"expected $total; target counted ${outcome.processedByTarget} " +
                s"(lost ${total - outcome.processedByTarget}), session counted ${outcome.processedBySession} " +
                s"(lost ${total - outcome.processedBySession})")
        },
        test("a lease holds the current message for the WHOLE message, not for one JS call") {
            // The state hand-off on its own, without waiting for a collision to happen to land.
            // `setCurrentMessage` and every read of it are SEPARATE entries into the context, so
            // excluding per call is not enough: between this thread's write and its read, another
            // partition can legally enter and overwrite `globalThis.__dekaf_currentMessage`. That
            // outcome throws nothing - it silently judges one message by another's contents.
            val pool = ConsumerSessionContextPool()
            val interloperReady = new CountDownLatch(1)
            val readBack = new java.util.concurrent.atomic.AtomicReference("")

            // BOTH threads take context 0 EXPLICITLY, not `withNextContext`. The pool is one context
            // today (poolSize pinned to 1), so `withNextContext` happens to hand both the same one -
            // but nothing pins that pin, and a future pool-size bump would silently give the two
            // threads DIFFERENT contexts, so they would never contend and this test would pass
            // vacuously. Pinning both to key 0 keeps the collision real whatever the pool size.
            val interloper = new Thread(
                { () =>
                    interloperReady.countDown()
                    pool.withContext(0)(_.setCurrentMessage("""{"key":"B"}""", Right("""{"n":2}""")))
                }: Runnable,
                "other-partition"
            )
            interloper.setDaemon(true)

            pool.withContext(0) { sessionContext =>
                sessionContext.setCurrentMessage("""{"key":"A"}""", Right("""{"n":1}"""))
                interloper.start()
                interloperReady.await()
                // Not a readiness wait - the opposite. It WIDENS the window deliberately, so that
                // "nothing got in" is a claim about the lease rather than about how fast the two
                // threads happened to run.
                Thread.sleep(200)
                readBack.set(sessionContext.runCode(s"$CurrentMessageVarName.key + '/' + $CurrentMessageVarName.value.n"))
            }
            interloper.join(30_000)

            assertTrue(readBack.get.contains("A/1"), !readBack.get.contains("B")) ??
                s"the message read back mid-lease was not the one this thread set: ${readBack.get}"
        }
    ) @@ TestAspect.sequential
