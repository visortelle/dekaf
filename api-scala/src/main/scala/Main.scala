import org.apache.pulsar.client.api.{ Consumer, PulsarClient, MessageListener }
import com.tools.teal.pulsar.ui.api.v1.consumer.{
  ConsumerServiceGrpc,
  CreateConsumerRequest,
  CreateConsumerResponse,
  DeleteConsumerRequest,
  DeleteConsumerResponse,
}
import io.grpc.{Server, ServerBuilder}
import scala.concurrent.{ExecutionContext, Future}
import io.grpc.stub.StreamObserver
import io.grpc.protobuf.services.ProtoReflectionService
import scala.jdk.CollectionConverters.*
import com.google.protobuf.ByteString
import org.apache.pulsar.client.api.{SubscriptionMode, SubscriptionType}
import org.apache.pulsar.client.api.SubscriptionInitialPosition
import org.apache.pulsar.client.api.RegexSubscriptionMode

// @main def main: Unit =
//   println("Starting Pulsar X-Ray server")
//   server.start
//   server.awaitTermination

val client =
  PulsarClient.builder().serviceUrl("pulsar://localhost:6650").build()

private class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
  override def readMessages(
      // request: ReadMessagesRequest,
      // responseObserver: StreamObserver[ReadMessagesResponse]
  ): Unit =
    // val listener: MessageListener[Array[Byte]] = (consumer, msg) => {
    //   val message = topic.Message(
    //     topic = request.topic,
    //     producerName = msg.getProducerName,
    //     properties = msg.getProperties.asScala.toMap,
    //     data = ByteString.copyFrom(msg.getData),
    //     messageId = ByteString.copyFrom(msg.getMessageId.toByteArray)
    //   )
    //   responseObserver.onNext(ReadMessagesResponse(messages = Seq(message)))
    //   consumer.acknowledge(msg)
    // }

    val consumer = client
      .newConsumer
      // .consumerName(request.consumerName)
      // .subscriptionMode()
      // .topic(request.topic)
      // .subscriptionName(request.subscriptionId)
      .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
      // .messageListener(listener)
      // .subscriptionType(request.subscriptionType)
      // .startPaused(request.startPaused)
      .subscribe

// val server = ServerBuilder
//   .forPort(8090)
//   .addService(
//     topic.TopicServiceGrpc
//       .bindService(ConsumerServiceImpl(), ExecutionContext.global)
//   )
//   .addService(ProtoReflectionService.newInstance)
//   .build
