package generators

import zio.*

type ConsumerName = String
type ConsumerIndex = Int

case class ConsumerPlan(
    name: String
)

object ConsumerPlan:
    def make(generator: ConsumerPlanGenerator, consumerIndex: ConsumerIndex): Task[ConsumerPlan] =
        val consumerPlan = ConsumerPlan(
            name = generator.getName(consumerIndex)
        )
        ZIO.succeed(consumerPlan)

case class ConsumerPlanGenerator(
    getName: ConsumerIndex => String
)

object ConsumerPlanGenerator:
    def make(
        getName: ConsumerIndex => String = i => s"consumer-$i"
    ): Task[ConsumerPlanGenerator] =
        val consumerPlanGenerator = ConsumerPlanGenerator(
            getName = getName
        )
        ZIO.succeed(consumerPlanGenerator)
