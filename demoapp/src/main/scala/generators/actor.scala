package generators

import zio.*
import _root_.client.{adminClient, pulsarClient}
import org.apache.pulsar.client.api.{Consumer, MessageListener, Producer, Message as PulsarMessage}
import demo.tenants.schemas.namespaces.exampleShop.shared.Convertible
import scala.jdk.FutureConverters._

import scala.reflect.ClassTag
import java.util.UUID

type ActorName = String
type ActorIndex = Int
type ConsumerMessageBytes = Array[Byte]
type ProducerMessageBytes = Array[Byte]

case class ActorPlan[A, B](
  name: ActorName,
  consumingTopicPlan: TopicPlan,
  producingTopicPlan: TopicPlan,
  producerPlan: ProducerPlan,
  subscriptionPlan: SubscriptionPlan,
  consumerPlan: ConsumerPlan,
)
(using val converter: Convertible[A, B])
(using val tagA: ClassTag[A], val tagB: ClassTag[B]) 

object ActorPlan:
  def make[A, B](actorPlanGenerator: ActorPlanGenerator[A, B], actorIndex: ActorIndex)
  (using converter: Convertible[A, B]): Task[ActorPlan[A, B]] =
    for {
      consumingTopicPlan <- actorPlanGenerator.mkConsumingTopicPlan(actorIndex)
      producingTopicPlan <- actorPlanGenerator.mkProducingTopicPlan(actorIndex)
      producerPlan <- actorPlanGenerator.mkProducerPlan(actorIndex)
      subscriptionPlan <- actorPlanGenerator.mkSubscriptionPlan(actorIndex)
      consumerPlan <- actorPlanGenerator.mkConsumerPlan(actorIndex)
    } yield
      ActorPlan[A, B](
        actorPlanGenerator.mkName(actorIndex),
        consumingTopicPlan,
        producingTopicPlan,
        producerPlan,
        subscriptionPlan,
        consumerPlan,
      )(using converter)(using actorPlanGenerator.tagA, actorPlanGenerator.tagB)

case class ActorPlanGenerator[A, B](
  mkName: ActorIndex => ActorName,
  mkConsumingTopicPlan: ActorIndex => Task[TopicPlan],
  mkProducingTopicPlan: ActorIndex => Task[TopicPlan],
  mkProducerPlan: ActorIndex => Task[ProducerPlan],
  mkSubscriptionPlan: ActorIndex => Task[SubscriptionPlan],
  mkConsumerPlan: ActorIndex => Task[ConsumerPlan],
)
(using val converter: Convertible[A, B])
(using val tagA: ClassTag[A], val tagB: ClassTag[B])

object ActorPlanGenerator:
  def make[A, B](
    mkName: ActorIndex => ActorName = _ => "dekaf-actor",
    mkConsumingTopicPlan: ActorIndex => Task[TopicPlan] = _ => TopicPlan.make,
    mkProducingTopicPlan: ActorIndex => Task[TopicPlan] = _ => TopicPlan.make,
    mkProducerPlan: ActorIndex => Task[ProducerPlan] = _ => ProducerPlan.make,
    mkSubscriptionPlan: ActorIndex => Task[SubscriptionPlan] = _ => SubscriptionPlan.make,
    mkConsumerPlan: ActorIndex => Task[ConsumerPlan] = _ => ConsumerPlan.make,
  )
  (using converter: Convertible[A, B])
  (using tagA: ClassTag[A], tagB: ClassTag[B]) : Task[ActorPlanGenerator[A, B]] =
    val actorPlanGenerator = ActorPlanGenerator[A, B](
      mkName,
      mkConsumingTopicPlan,
      mkProducingTopicPlan,
      mkProducerPlan,
      mkSubscriptionPlan,
      mkConsumerPlan,
    )
    ZIO.succeed(actorPlanGenerator)

object ActorPlanExecutor:
  private def makeActorConsumer[A, B](actorPlan: ActorPlan[A, B], producer: Producer[ProducerMessageBytes]) =
    def makeActorMessageListener[T]: MessageListener[T] =
      (consumer: Consumer[T], msg: PulsarMessage[T]) =>
        try
          val consumedMessage = Serde.fromJson[A](msg.getData)(using actorPlan.tagA)
          val messageToProduce = actorPlan.converter.convert(consumedMessage)

          val messageBytes = Serde.toJsonBytes(messageToProduce)
          val messageKey = if msg.hasKey then msg.getKey else UUID.randomUUID.toString

          val effect = for {
            _ <- actorPlan.producerPlan.messageIndex.update(_ + 1)
            _ <- ZIO.fromFuture(e =>
              producer.newMessage
                .key(messageKey)
                .value(messageBytes)
                .sendAsync
                .asScala
            )
          } yield ()

          Unsafe.unsafe { implicit u =>
            Runtime.default.unsafe.run(effect)
          }

          consumer.acknowledge(msg)
        catch
          case e: Throwable =>
            consumer.acknowledge(msg)
    end makeActorMessageListener

    for {
      consumer <- ZIO.attempt(
        pulsarClient.newConsumer
          .subscriptionName(actorPlan.subscriptionPlan.name)
          .subscriptionType(actorPlan.subscriptionPlan.subscriptionType)
          .consumerName(actorPlan.consumerPlan.name)
          .topic(actorPlan.consumingTopicPlan.mkTopicFqn)
          .messageListener(makeActorMessageListener)
          .subscribe
      )
      _ <- ZIO.logInfo(s"Started actor consumer ${actorPlan.consumerPlan.name} for topic ${actorPlan.consumingTopicPlan.name}")
    } yield consumer

  def start[A, B](actorPlan: ActorPlan[A, B]): Task[Unit] =
    for {
      producer <- ProducerPlanExecutor.createProducer(actorPlan.producerPlan.name, actorPlan.producingTopicPlan)
      _ <- ZIO.logInfo(s"Started actor producer ${actorPlan.producerPlan.name} for topic ${actorPlan.producingTopicPlan.name}")
      _ <- makeActorConsumer(actorPlan, producer)
    } yield ()
