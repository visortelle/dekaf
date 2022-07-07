import org.apache.pulsar.client.api.Consumer
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.api.MessageListener
import tools.teal.pulsar.ui.api.topic
import tools.teal.pulsar.ui.api.topic.ReadMessagesRequest
import tools.teal.pulsar.ui.api.topic.ReadMessagesResponse
import io.grpc.{Server, ServerBuilder}
import scala.concurrent.{ExecutionContext, Future}
import io.grpc.stub.StreamObserver
import io.grpc.protobuf.services.ProtoReflectionService
import scala.jdk.CollectionConverters.*
import com.google.protobuf.ByteString

@main def main: Unit =
  println("Hello world!")
  server.start
  server.awaitTermination

val client = PulsarClient.builder().serviceUrl("pulsar://localhost:6650").build()

private class TopicServiceImpl extends topic.TopicServiceGrpc.TopicService:
  override def readMessages(request: ReadMessagesRequest, responseObserver: StreamObserver[ReadMessagesResponse]): Unit =
    val listener: MessageListener[Array[Byte]] = (consumer, msg) => {
      println("Message received: " + msg.getData)

      val message = topic.Message(
        topic = request.topic,
        producerName = msg.getProducerName,
        properties = msg.getProperties.asScala.toMap,
        data = ByteString.copyFrom(msg.getData),
      )
      responseObserver.onNext(ReadMessagesResponse(messages = Seq(message)))
      consumer.acknowledge(msg)
    }

    val consumer = client.newConsumer()
      .topic(request.topic)
      .subscriptionName("test-subscription")
      .messageListener(listener)
      .subscribe()

val server = ServerBuilder
  .forPort(8090)
  .addService(topic.TopicServiceGrpc.bindService(TopicServiceImpl(), ExecutionContext.global))
  .addService(ProtoReflectionService.newInstance)
  .build

def consume(tenant: String, namespace: String, topicType: "persistent" | "non-persistent", topic: String): Unit =
  ()

