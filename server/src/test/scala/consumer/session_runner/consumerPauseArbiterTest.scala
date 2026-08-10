package consumer.session_runner

import org.apache.pulsar.client.api.Consumer
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.atomic.AtomicInteger

/** THE PAUSE ARBITER: one consumer, three legitimate owners, no stomping.
  *
  * The deterministic failure this class ended, pinned here as its contract: at the skip
  * boundary the merge's settle-time resume woke consumers the delivery LIMITER had just held.
  * The limiter's flag still said "held", so it never re-paused, and the paced queue grew without
  * a bound. With per-reason arbitration a release resumes the consumer only when NO other owner
  * still holds it - each mechanism touches its own reason and nothing else.
  */
object consumerPauseArbiterTest extends ZIOSpecDefault:

    private final class CountingConsumer:
        val paused = AtomicInteger(0)
        val resumed = AtomicInteger(0)
        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "pause"    => paused.incrementAndGet(); null
                        case "resume"   => resumed.incrementAndGet(); null
                        case "toString" => "counting-consumer"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private final class ThrowingConsumer:
        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "pause" | "resume" => throw new IllegalStateException("consumer is mid-close")
                        case "toString"         => "throwing-consumer"
                        case _                  => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    def spec = suite(this.getClass.toString)(
        test("THE SKIP-BOUNDARY STOMP IS GONE: the merge letting go cannot wake a limiter-held consumer") {
            val counting = CountingConsumer()
            val arbiter = ConsumerPauseArbiter(counting.consumer)
            arbiter.hold(PauseReason.Limiter) // paced queue crossed its watermark
            arbiter.hold(PauseReason.Merge)   // hot stream at the merge's watermark
            arbiter.release(PauseReason.Merge) // the cut releases the merge's hold...
            val resumedWhileLimiterHolds = counting.resumed.get
            arbiter.release(PauseReason.Limiter) // ...and only the limiter's own release resumes
            assertTrue(
                resumedWhileLimiterHolds == 0,
                counting.resumed.get == 1,
                arbiter.heldReasons.isEmpty
            ) ?? s"resumedWhileLimiterHolds=$resumedWhileLimiterHolds resumedTotal=${counting.resumed.get}"
        },
        test("a user resume does not release the merge's hold on a hot stream") {
            val counting = CountingConsumer()
            val arbiter = ConsumerPauseArbiter(counting.consumer)
            arbiter.hold(PauseReason.User)
            arbiter.hold(PauseReason.Merge)
            arbiter.release(PauseReason.User)
            assertTrue(
                counting.resumed.get == 0,
                arbiter.heldReasons == Set(PauseReason.Merge)
            )
        },
        test("holding the same reason twice needs only one release, and resume fires exactly once") {
            val counting = CountingConsumer()
            val arbiter = ConsumerPauseArbiter(counting.consumer)
            arbiter.hold(PauseReason.Merge)
            arbiter.hold(PauseReason.Merge)
            arbiter.release(PauseReason.Merge)
            assertTrue(counting.resumed.get == 1, arbiter.heldReasons.isEmpty)
        },
        test("every hold re-asserts the client-local pause flag - a rogue direct resume is healed") {
            val counting = CountingConsumer()
            val arbiter = ConsumerPauseArbiter(counting.consumer)
            arbiter.hold(PauseReason.Limiter)
            counting.consumer.resume() // somebody stomps directly, outside the arbiter
            arbiter.hold(PauseReason.Merge) // the next hold of ANY reason re-pauses
            assertTrue(counting.paused.get == 2)
        },
        test("a throwing client call answers false, and the reason set stays truthful regardless") {
            val throwing = ThrowingConsumer()
            val arbiter = ConsumerPauseArbiter(throwing.consumer)
            val held = arbiter.hold(PauseReason.User)
            val reasonsAfterHold = arbiter.heldReasons
            val released = arbiter.release(PauseReason.User)
            assertTrue(
                !held,
                reasonsAfterHold == Set(PauseReason.User),
                !released,
                arbiter.heldReasons.isEmpty
            )
        }
    )
