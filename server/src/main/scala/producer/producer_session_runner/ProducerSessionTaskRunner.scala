package producer.producer_session_runner

import zio.*
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextPool}
import _root_.producer.producer_session.producer_session_task.ProducerSessionTask
import _root_.producer.producer_task.ProducerTask
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.admin.PulsarAdmin
import org.graalvm.polyglot.Context

case class ProducerSessionTaskRunner(
    pulsarClient: PulsarClient,
    adminClient: PulsarAdmin,
    taskIndex: Int,
    taskConfig: ProducerSessionTask,
    polyglotContext: Context,
    taskRunner: ProducerTaskRunner
):
    def start(): Task[Unit] =
        taskRunner match
            case v: ProducerTaskRunner => v.resume()

    def stop(): Task[Unit] =
        taskRunner match
            case v: ProducerTaskRunner => v.stop()

object ProducerSessionTaskRunner:
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        taskIndex: Int,
        taskConfig: ProducerSessionTask,
        polyglotContext: Context
    ): ProducerSessionTaskRunner =
        val taskRunner = taskConfig.task match
            case v: ProducerTask =>
                ProducerTaskRunner.make(
                    pulsarClient = pulsarClient,
                    adminClient = adminClient,
                    taskConfig = v,
                    polyglotContext = polyglotContext
                )

        ProducerSessionTaskRunner(
            pulsarClient = pulsarClient,
            adminClient = adminClient,
            taskIndex = taskIndex,
            taskConfig = taskConfig,
            polyglotContext = polyglotContext,
            taskRunner = taskRunner
        )
