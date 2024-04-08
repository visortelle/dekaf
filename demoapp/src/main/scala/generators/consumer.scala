package generators

import zio.*

type ConsumerName = String
type ConsumerIndex = Int

case class ConsumerPlan(
    name: String
)

object ConsumerPlan:
    def make: Task[ConsumerPlan] = ZIO.succeed(
        ConsumerPlan(
            name = "demoapp-consumer"
        )
    )

    def make(generator: ConsumerPlanGenerator, consumerIndex: ConsumerIndex): Task[ConsumerPlan] =
        val consumerPlan = ConsumerPlan(
            name = generator.mkName(consumerIndex)
        )
        ZIO.succeed(consumerPlan)

case class ConsumerPlanGenerator(
    mkName: ConsumerIndex => String
)

object ConsumerPlanGenerator:
    def make(
        mkName: ConsumerIndex => String = i => s"demoapp-$i"
    ): Task[ConsumerPlanGenerator] =
        val consumerPlanGenerator = ConsumerPlanGenerator(
            mkName = mkName
        )
        ZIO.succeed(consumerPlanGenerator)
