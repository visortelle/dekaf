package producer.producer_session_runner

import consumer.session_runner.ConsumerSessionContext
import _root_.producer.producer_session.producer_session_task.ProducerSessionTask
import org.apache.pulsar.client.api.Producer

case class ProducerSessionTaskRunner(
    taskIndex: Int,
    taskConfig: ProducerSessionTask,
    sessionContext: ConsumerSessionContext,
):
    def collectTopicFqns: Vector[String] = ???

object ProducerSessionTaskRunner:
    def make(
        taskIndex: Int,
        taskConfig: ProducerSessionTask,
        sessionContext: ConsumerSessionContext
    ): ProducerSessionTaskRunner = ???
