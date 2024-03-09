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
