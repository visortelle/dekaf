package consumer

import zio.*
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient

import java.io.ByteArrayOutputStream

type ConsumerSessionId = String

case class ConsumerSession(
    consumers: Map[String, ConsumerSessionConsumer],
    grpcResponseObserver: Option[io.grpc.stub.StreamObserver[pb.ResumeConsumerSessionResponse]],
    schemasByTopic: SchemasByTopic
):
    def pause(): Task[Unit] = ???
    def resume(): Task[Unit] = ???
    def stop(): Task[Unit] = ???

object ConsumerSession:
    def createFromPb(
        pulsarClient: PulsarClient,
        pulsarAdmin: PulsarAdmin,
        sessionId: String,
        sessionConfigPb: pb.ConsumerSessionConfig
    ): Task[ConsumerSession] = for {
        messageFilterContext <- ZIO.attempt(MessageFilterContext(MessageFilterContextConfig(stdout = new ByteArrayOutputStream())))
        consumerPairs <- ZIO.foreachPar(sessionConfigPb.consumerConfigs) {
            consumerConfig =>
                for {
                    consumerId <- ZIO.succeed(s"$sessionId-${java.util.UUID.randomUUID().toString}")
                    consumer <- ConsumerSessionConsumer.createFromPb(
                        pulsarClient = pulsarClient,
                        pulsarAdmin = pulsarAdmin,
                        configPb = consumerConfig,
                        messageFilterContext = messageFilterContext,
                        consumerId = consumerId
                    )
                } yield (consumerId, consumer)
        }
        consumers = consumerPairs.toMap
        topicsToConsume <- ZIO.attempt(consumers.map(_._2.pulsarConsumer.getTopic).toVector)
        schemasByTopic <- ZIO.attempt(getSchemasByTopic(pulsarAdmin, topicsToConsume))
    } yield ConsumerSession(
        consumers = consumers,
        grpcResponseObserver = None,
        schemasByTopic = schemasByTopic
    )
