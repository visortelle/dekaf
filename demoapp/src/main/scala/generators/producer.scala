package generators

import zio.*

type ProducerIndex = Int
type ProducerName = String

case class Message(
    key: Option[String],
    payload: Array[Byte],
    properties: Option[Map[String, String]]
)
object Message:
  def apply(key: String, payload: Array[Byte], properties: Map[String, String]): Message =
    Message(Some(key), payload, Some(properties))
    
  def apply(key: String, payload: Array[Byte]): Message =
    Message(Some(key), payload, None)
    
  def apply(payload: Array[Byte]): Message =
    Message(None, payload, None)

case class ProducerPlan(
    name: ProducerName,
    schedule: Schedule[Any, Any, Any],
    mkMessage: MessageIndex => Message,
    messageIndex: Ref[MessageIndex]
)

object ProducerPlan:
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
