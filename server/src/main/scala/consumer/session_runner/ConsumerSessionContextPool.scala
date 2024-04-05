package consumer.session_runner

import java.io.{ByteArrayOutputStream, PrintStream}
import org.graalvm.polyglot.Engine

import java.util.concurrent.{ScheduledThreadPoolExecutor, TimeUnit}
import scala.collection.mutable
import scala.util.{Failure, Success, Try}
import java.util.concurrent.locks.ReentrantLock
import com.typesafe.scalalogging.Logger

val isDebug = false

object ConsumerSessionContextPool:
    val logger: Logger = Logger(getClass.getName)

    private val poolSize = 10
    private val contextPool: mutable.Queue[ConsumerSessionContext] = mutable.Queue.empty

    private val lock = new ReentrantLock()
    private val taskExecutor = new ScheduledThreadPoolExecutor(1)

    private def createContext(): ConsumerSessionContext =
        val engine = Engine.newBuilder().build()

        ConsumerSessionContext(
            ConsumerSessionContextConfig(
                stdout = if isDebug then java.lang.System.out else new ByteArrayOutputStream(),
                engine = engine
            )
        )

    def init(): Unit =
        logger.info(s"Initializing ConsumerSessionContextPool. Pool size: $poolSize")

        val task = new Runnable {
            def run(): Unit =
                if contextPool.size < poolSize && !lock.isLocked then
                    lock.lock()

                    val context: ConsumerSessionContext = createContext()
                    contextPool.enqueue(context)

                    lock.unlock()
        }
        taskExecutor.scheduleAtFixedRate(task, 0, 100, TimeUnit.MILLISECONDS)

    def getContext: ConsumerSessionContext =
        Try(contextPool.dequeue) match
            case Success(context) => context
            case Failure(_)       => createContext()
