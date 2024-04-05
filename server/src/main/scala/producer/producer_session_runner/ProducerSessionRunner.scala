package producer.producer_session_runner

import zio.*
import com.tools.teal.pulsar.ui.producer.v1.producer as producerPb
import consumer.session_config.ConsumerSessionConfig
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextPool}
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import producer.producer_session.ProducerSessionConfig
import producer.producer_session.producer_session_task.ProducerSessionTask
import org.graalvm.polyglot.Context
import org.apache.commons.lang3.time.StopWatch

case class ProducerSessionRunner(
    pulsarClient: PulsarClient,
    adminClient: PulsarAdmin,
    sessionId: String,
    sessionConfig: ProducerSessionConfig,
    polyglotContext: Context,
    taskRunners: Vector[ProducerSessionTaskRunner] = Vector.empty,
    var numMessageProduced: Long = 0
):
    def incrementNumMessageProduced(): Unit = numMessageProduced = numMessageProduced + 1

    def start(): Task[Unit] =
        ZIO.foreach(taskRunners)(_.start()).unit

    def pause(): Task[Unit] = ???

    def stop(): Task[Unit] = ???

object ProducerSessionRunner:
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        sessionId: String,
        sessionConfig: ProducerSessionConfig
    ): ProducerSessionRunner =
        val _watch = new StopWatch()
        _watch.start()
        val sessionContext = ConsumerSessionContextPool.getContext
        _watch.stop()
        java.lang.System.out.println(s"--------------- JS CONTEXT CREATION - ${_watch.getTime}")

        val taskRunners = sessionConfig.tasks.zipWithIndex.map((taskConfig, taskIndex) =>
            ProducerSessionTaskRunner.make(
                pulsarClient = pulsarClient,
                adminClient = adminClient,
                taskIndex = taskIndex,
                taskConfig = taskConfig,
                polyglotContext = sessionContext.context
            )
        )

        ProducerSessionRunner(
            pulsarClient = pulsarClient,
            adminClient = adminClient,
            sessionId = sessionId,
            sessionConfig = sessionConfig,
            polyglotContext = sessionContext.context,
            taskRunners = taskRunners
        )
