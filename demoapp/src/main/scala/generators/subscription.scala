package generators

import monocle.syntax.all.*
import org.apache.pulsar.client.api.SubscriptionType

type SubscriptionName = String
type SubscriptionIndex = Int

case class SubscriptionPlan(
    name: SubscriptionName,
    subscriptionType: SubscriptionType,
    consumers: Map[SubscriptionName, ConsumerPlan]
)

object SubscriptionPlan:
    def make(generator: SubscriptionPlanGenerator, subscriptionIndex: SubscriptionIndex): SubscriptionPlan =
        val consumerGenerators =
            List.tabulate(generator.getConsumersCount(subscriptionIndex))(consumerIndex =>
                generator.getConsumerGenerator(consumerIndex)
            )

        val consumers = consumerGenerators.zipWithIndex.map { case (consumerGenerator, i) =>
            val consumerName = consumerGenerator.getName(i)
            val _consumerGenerator = consumerGenerator.focus(_.getName).replace(_ => consumerName)
            consumerGenerator.getName(i) -> ConsumerPlan.make(_consumerGenerator, i)
        }.toMap

        SubscriptionPlan(
            name = generator.getName(subscriptionIndex),
            subscriptionType = generator.getSubscriptionType(subscriptionIndex),
            consumers
        )

case class SubscriptionPlanGenerator(
    getName: SubscriptionIndex => String,
    getConsumersCount: SubscriptionIndex => Int,
    getSubscriptionType: SubscriptionIndex => SubscriptionType,
    getConsumerGenerator: ConsumerIndex => ConsumerPlanGenerator
)

object SubscriptionPlanGenerator:
    def make(
        getName: SubscriptionIndex => String = i => s"subscription-$i",
        getConsumersCount: SubscriptionIndex => Int = _ => 3,
        getSubscriptionType: SubscriptionIndex => SubscriptionType = _ => SubscriptionType.Exclusive,
        getConsumerGenerator: ConsumerIndex => ConsumerPlanGenerator = consumerIndex => ConsumerPlanGenerator.make()
    ): SubscriptionPlanGenerator =
        SubscriptionPlanGenerator(
            getName = getName,
            getConsumersCount = getConsumersCount,
            getSubscriptionType = getSubscriptionType,
            getConsumerGenerator = getConsumerGenerator
        )
