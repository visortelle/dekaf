package consumer.session_runner

import java.io.{ByteArrayOutputStream, PrintStream}
import org.graalvm.polyglot.Engine

import java.util.concurrent.atomic.AtomicInteger;

// XXX - Kept as is for further optimization.
case class ConsumerSessionContextPool(isDebug: Boolean = false):
    private val engine = Engine.newBuilder().build()
    // XXX - Keep the pool size equal to "1" for now.
    private val poolSize = Runtime.getRuntime.availableProcessors().min(1)
    private val contextPool: Map[Int, ConsumerSessionContext] = Vector.tabulate(poolSize) { i =>
        val sessionContext = ConsumerSessionContext(
            ConsumerSessionContextConfig(
                stdout = if isDebug then java.lang.System.out else new ByteArrayOutputStream(),
                engine = engine
            )
        )
        (i, sessionContext)
    }.toMap

    private val currentContextKey = new AtomicInteger(0)
    def getNextContext: ConsumerSessionContext =
        val key = currentContextKey.getAndUpdate(k => {
            if k == poolSize - 1
            then 0
            else k + 1
        })

        contextPool(key)

    def getContext(key: Int): ConsumerSessionContext = contextPool(key)

    /** Lease the next context for the WHOLE of `use`, with no other thread inside it meanwhile.
      *
      * Every caller that runs off a delivery thread - the per-message handler, the browser console -
      * must come through here rather than through `getNextContext`/`getContext`: the pool is one
      * context shared by every partition listener of the session, and a raw handle carries no
      * exclusion. See `ConsumerSessionContext.exclusively` for what that exclusion is protecting.
      */
    def withNextContext[A](use: ConsumerSessionContext => A): A =
        val sessionContext = getNextContext
        sessionContext.exclusively(use(sessionContext))

    def withContext[A](key: Int)(use: ConsumerSessionContext => A): A =
        val sessionContext = getContext(key)
        sessionContext.exclusively(use(sessionContext))

    /** Release every context and the engine behind them, when the session that owns this pool stops,
      * and ANSWER WITH WHAT COULD NOT BE RELEASED.
      *
      * Best-effort per item, so one context that will not close cannot strand the rest or the
      * engine. Idempotent: closing an already-closed Graal context or engine is a no-op, and
      * stopping a session twice is an ordinary thing for a client to do.
      *
      * It used to swallow every failure and answer `Unit`, and the caller discarded that too - so a
      * context still executing on some thread stayed open, holding its heap, while `deleteConsumer`
      * told the client the session had been released. The caller aggregates these into the same
      * failure it reports for consumers.
      */
    def close(): Vector[String] =
        val contextFailures = contextPool.toVector.flatMap { (key, sessionContext) =>
            scala.util.Try(sessionContext.close()).failed.toOption.map(err => s"JS context $key: ${err.getMessage}")
        }
        val engineFailure = scala.util.Try(engine.close(true)).failed.toOption.map(err => s"JS engine: ${err.getMessage}")
        contextFailures ++ engineFailure.toVector
