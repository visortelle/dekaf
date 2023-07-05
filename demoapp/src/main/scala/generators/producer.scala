package generators

import zio.*

type ProducerIndex = Int
type ProducerName = String

case class ProducerPlan(
    name: ProducerName,
    schedule: Schedule[Any, Any, Any],
    getPayload: MessageIndex => Array[Byte],
    getKey: MessageIndex => Option[String],
    messageIndex: Ref[MessageIndex]
)

object ProducerPlan:
    def make(generator: ProducerPlanGenerator, producerIndex: ProducerIndex): Task[ProducerPlan] = for {
        messageIndex <- Ref.make[MessageIndex](0)
        producerPlan <- ZIO.attempt {
            ProducerPlan(
                name = generator.getName(producerIndex),
                getPayload = generator.getPayload(producerIndex),
                getKey = generator.getKey(producerIndex),
                schedule = generator.getSchedule(producerIndex),
                messageIndex = messageIndex
            )
        }
    } yield producerPlan

case class ProducerPlanGenerator(
    getName: ProducerIndex => String,
    getPayload: ProducerIndex => MessageIndex => Array[Byte],
    getKey: ProducerIndex => MessageIndex => Option[String],
    getSchedule: ProducerIndex => Schedule[Any, Any, Any]
)

object ProducerPlanGenerator:
    def make(
        getName: ProducerIndex => String = producerIndex => s"producer-$producerIndex",
        getPayload: ProducerIndex => MessageIndex => Array[Byte] = _ => _ => Array.emptyByteArray,
        getKey: ProducerIndex => MessageIndex => Option[String] = _ => _ => None,
        getSchedule: ProducerIndex => Schedule[Any, Any, Any] = _ => Schedule.fixed(Duration.fromSeconds(1))
    ): Task[ProducerPlanGenerator] =
        val producerPlanGenerator = ProducerPlanGenerator(
            getName = getName,
            getPayload = getPayload,
            getKey = getKey,
            getSchedule = getSchedule
        )
        ZIO.succeed(producerPlanGenerator)
