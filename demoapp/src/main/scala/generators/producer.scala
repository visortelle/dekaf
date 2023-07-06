package generators

import zio.*

type ProducerIndex = Int
type ProducerName = String

case class ProducerPlan(
    name: ProducerName,
    schedule: Schedule[Any, Any, Any],
    mkPayload: MessageIndex => Array[Byte],
    mkKey: MessageIndex => Option[String],
    messageIndex: Ref[MessageIndex]
)

object ProducerPlan:
    def make(generator: ProducerPlanGenerator, producerIndex: ProducerIndex): Task[ProducerPlan] = for {
        messageIndex <- Ref.make[MessageIndex](0)
        producerPlan <- ZIO.attempt {
            ProducerPlan(
                name = generator.mkName(producerIndex),
                mkPayload = generator.mkPayload(producerIndex),
                mkKey = generator.mkKey(producerIndex),
                schedule = generator.mkSchedule(producerIndex),
                messageIndex = messageIndex
            )
        }
    } yield producerPlan

case class ProducerPlanGenerator(
    mkName: ProducerIndex => String,
    mkPayload: ProducerIndex => MessageIndex => Array[Byte],
    mkKey: ProducerIndex => MessageIndex => Option[String],
    mkSchedule: ProducerIndex => Schedule[Any, Any, Any]
)

object ProducerPlanGenerator:
    def make(
        mkName: ProducerIndex => String = producerIndex => s"producer-$producerIndex",
        mkPayload: ProducerIndex => MessageIndex => Array[Byte] = _ => _ => Array.emptyByteArray,
        mkKey: ProducerIndex => MessageIndex => Option[String] = _ => _ => None,
        mkSchedule: ProducerIndex => Schedule[Any, Any, Any] = _ => Schedule.fixed(Duration.fromSeconds(1))
    ): Task[ProducerPlanGenerator] =
        val producerPlanGenerator = ProducerPlanGenerator(
            mkName = mkName,
            mkPayload = mkPayload,
            mkKey = mkKey,
            mkSchedule = mkSchedule
        )
        ZIO.succeed(producerPlanGenerator)
