package consumer.session_runner

import java.io.ByteArrayOutputStream
import org.graalvm.polyglot.Engine;

case class ConsumerSessionContextPool():
    private val engine = Engine.newBuilder().build()
    private val poolSize = Runtime.getRuntime.availableProcessors().min(16)
    private val contextPool: Map[Int, ConsumerSessionContext] = Vector.tabulate(poolSize) { i =>
        val sessionContext = ConsumerSessionContext(
            ConsumerSessionContextConfig(
                stdout = new ByteArrayOutputStream(),
                engine = engine
            )
        )
        (i, sessionContext)
    }.toMap
    private var currentContextKey: Int = 0

    def getNextContext: ConsumerSessionContext =
        currentContextKey =
            if currentContextKey == poolSize - 1
            then 0
            else currentContextKey + 1

        contextPool(currentContextKey)

    def getContext(key: Int): ConsumerSessionContext =
        contextPool(key)
