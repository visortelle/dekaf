package generators

import zio.*

type ProducerIndex = Int
type ProducerName = String

case class ProducerPlan(
    name: ProducerName,
    schedule: Schedule[Any, Any, Any],
    getPayload: ProducerIndex => Array[Byte]
)

object ProducerPlan:
    def make(generator: ProducerPlanGenerator, producerIndex: ProducerIndex): ProducerPlan =
        ProducerPlan(
            name = generator.getName(producerIndex),
            getPayload = _ => generator.getPayload(producerIndex),
            schedule = generator.getSchedule(producerIndex),
        )

case class ProducerPlanGenerator(
    getName: ProducerIndex => String,
    getPayload: ProducerIndex => Array[Byte] = _ => Array.emptyByteArray,
    getSchedule: ProducerIndex => Schedule[Any, Any, Any]
)

object ProducerPlanGenerator:
    def make(
        getName: ProducerIndex => String = producerIndex => s"producer-$producerIndex",
        getPayload: ProducerIndex => Array[Byte] = _ => Array.emptyByteArray,
        getSchedule: ProducerIndex => Schedule[Any, Any, Any] = _ => Schedule.fixed(Duration.fromSeconds(1))
    ): ProducerPlanGenerator =
        ProducerPlanGenerator(
            getName = getName,
            getPayload = getPayload,
            getSchedule = getSchedule
        )
