package generators

import client.pulsarClient
import org.apache.pulsar.client.api.Producer
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema
import zio.*
import app.DekafDemoApp.allProducers

import scala.jdk.CollectionConverters.*

type ProducerIndex = Int
type ProducerName = String

case class Message(
  key: Option[String],
  payload: Array[Byte],
  properties: Option[Map[String, String]]
)

object Message:
  def apply(payload: Array[Byte], key: Option[String] = None, properties: Option[Map[String, String]] = None): Message =
    Message(key, payload, properties)

case class ProducerPlan(
  name: ProducerName,
  schedule: Schedule[Any, Any, Any],
  mkMessage: MessageIndex => Message,
  messageIndex: Ref[MessageIndex]
)

object ProducerPlan:
  def make: Task[ProducerPlan] = for {
    ref <- Ref.make[MessageIndex](0)
  } yield ProducerPlan(
    "dekaf_default_producer",
    Schedule.forever,
    _ => Message(Array.emptyByteArray),
    ref
  )

  def make(generator: ProducerPlanGenerator, producerIndex: ProducerIndex): Task[ProducerPlan] = for {
    messageIndex <- Ref.make[MessageIndex](0)
    producerPlan <- ZIO.attempt {
      ProducerPlan(
        name = generator.mkName(producerIndex),
        mkMessage = generator.mkMessage(producerIndex),
        schedule = generator.mkSchedule(producerIndex),
        messageIndex = messageIndex
      )
    }
  } yield producerPlan

case class ProducerPlanGenerator(
  mkName: ProducerIndex => String,
  mkMessage: ProducerIndex => MessageIndex => Message,
  mkSchedule: ProducerIndex => Schedule[Any, Any, Any]
)

object ProducerPlanGenerator:
  def make(
    mkName: ProducerIndex => String = producerIndex => s"producer-$producerIndex",
    mkMessage: ProducerIndex => MessageIndex => Message = _ => _ => Message(None, Array.emptyByteArray, None),
    mkSchedule: ProducerIndex => Schedule[Any, Any, Any] = _ => Schedule.fixed(Duration.fromSeconds(1))
  ): Task[ProducerPlanGenerator] =
    val producerPlanGenerator = ProducerPlanGenerator(
      mkName = mkName,
      mkMessage = mkMessage,
      mkSchedule = mkSchedule
    )
    ZIO.succeed(producerPlanGenerator)

object ProducerPlanExecutor:
  def startProduce(producerPlan: ProducerPlan, topicPlan: TopicPlan): Task[Unit] =
    val topicFqn = topicPlan.topicFqn

    for {
      producer <- ZIO.attempt {
        val schema = new AutoProduceBytesSchema[Array[Byte]]
        pulsarClient
          .newProducer(schema)
          .producerName(producerPlan.name)
          .topic(topicFqn)
          .create
      }
      _ <- ZIO.succeed(allProducers.appended(producer))
      _ <- ZIO.logInfo(s"Started producer ${producerPlan.name} for topic ${topicPlan.name}")
      _ <- producerPlan.messageIndex
        .update { messageIndex =>
          val message = producerPlan.mkMessage(messageIndex)

          val messageBuilder = producer.newMessage

          message.key.foreach(messageBuilder.key)
          messageBuilder.value(message.payload)
          message.properties.foreach(properties =>
            messageBuilder.properties(properties.asJava)
          )

          messageBuilder.sendAsync

          messageIndex + 1
        }
        .repeat(producerPlan.schedule)
    } yield ()

  def startProduce(topic: TopicPlan): Task[Unit] =
    ZIO.foreachParDiscard(topic.producers.values) { producerPlan =>
      startProduce(producerPlan, topic)
    }

  def startMultiTopicProducer(producerPlan: ProducerPlan, topicPlans: List[TopicPlan]): Task[Unit] =
    for {
      producers <- ZIO.foreachPar(topicPlans) { topicPlan =>
        ZIO.attempt {
          val schema = new AutoProduceBytesSchema[Array[Byte]]
          pulsarClient
            .newProducer(schema)
            .producerName(producerPlan.name)
            .topic(topicPlan.topicFqn)
            .create
        }
      }
      _ <- ZIO.logInfo(s"Started producers ${producerPlan.name} for topics ${topicPlans.map(_.name).mkString(", ")}")
      _ <- producerPlan.messageIndex
        .update { messageIndex =>
          val message = producerPlan.mkMessage(messageIndex)

          producers.foreach { producer =>
            val messageBuilder = producer.newMessage

            message.key.foreach(messageBuilder.key)
            messageBuilder.value(message.payload)
            message.properties.foreach(properties =>
              messageBuilder.properties(properties.asJava)
            )

            messageBuilder.sendAsync
          }

          messageIndex + 1
        }.repeat(producerPlan.schedule)
    } yield ()
