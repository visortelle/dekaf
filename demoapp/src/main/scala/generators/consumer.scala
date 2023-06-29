package generators

type ConsumerName = String
type ConsumerIndex = Int

case class ConsumerPlan(
    name: String
)

object ConsumerPlan:
    def make(generator: ConsumerPlanGenerator, consumerIndex: ConsumerIndex): ConsumerPlan =
        ConsumerPlan(
            name = generator.getName(consumerIndex)
        )

case class ConsumerPlanGenerator(
    getName: ConsumerIndex => String
)

object ConsumerPlanGenerator:
    def make(
        getName: ConsumerIndex => String = i => s"consumer-$i"
    ): ConsumerPlanGenerator =
        ConsumerPlanGenerator(
            getName = getName
        )
