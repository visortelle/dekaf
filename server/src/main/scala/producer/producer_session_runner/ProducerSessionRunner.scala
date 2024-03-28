package producer.producer_session_runner

import com.tools.teal.pulsar.ui.producer.v1.producer as producerPb
import consumer.session_config.ConsumerSessionConfig
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextPool}
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import producer.producer_session.ProducerSessionConfig

type ProducerSessionTaskIndex = Int

case class ProducerSessionRunner(
    sessionId: String,
    sessionConfig: ProducerSessionConfig,
    sessionContext: ConsumerSessionContext,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[producerPb.ResumeProducerSessionResponse]],
    var tasks: Map[ProducerSessionTaskIndex, ProducerSessionTaskRunner],
    var numMessageProduced: Long = 0
):
    def incrementNumMessageProduced(): Unit = numMessageProduced = numMessageProduced + 1

    def resume(): Unit = ???

    def pause(): Unit = ???

    def stop(): Unit = ???

object ProducerSessionRunner:
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        sessionId: String,
        sessionConfig: ProducerSessionConfig
    ): ProducerSessionRunner = ???
