package generators

import zio.*

type ProducerIndex = Int
type ProducerName = String

case class ProducerPlan(
    name: ProducerName,
    schedule: Schedule[Any, Any, Any],
    getPayload: MessageIndex => Array[Byte],
    var messageIndex: MessageIndex
)

object ProducerPlan:
    def make(generator: ProducerPlanGenerator, producerIndex: ProducerIndex): ProducerPlan =
        ProducerPlan(
            name = generator.getName(producerIndex),
            getPayload = generator.getPayload(producerIndex),
            schedule = generator.getSchedule(producerIndex),
            messageIndex = 0
        )

case class ProducerPlanGenerator(
    getName: ProducerIndex => String,
    getPayload: ProducerIndex => MessageIndex => Array[Byte],
    getSchedule: ProducerIndex => Schedule[Any, Any, Any]
)

object ProducerPlanGenerator:
    def make(
        getName: ProducerIndex => String = producerIndex => s"producer-$producerIndex",
        getPayload: ProducerIndex => MessageIndex => Array[Byte] = _ => _ => Array.emptyByteArray,
        getSchedule: ProducerIndex => Schedule[Any, Any, Any] = _ => Schedule.fixed(Duration.fromSeconds(1))
    ): ProducerPlanGenerator =
        ProducerPlanGenerator(
            getName = getName,
            getPayload = getPayload,
            getSchedule = getSchedule
        )
