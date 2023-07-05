package generators

import zio.*
import monocle.syntax.all.*
import org.apache.pulsar.client.api.SubscriptionType

type SubscriptionName = String
type SubscriptionIndex = Int

case class SubscriptionPlan(
    name: SubscriptionName,
    subscriptionType: SubscriptionType,
    consumers: Map[ConsumerName, ConsumerPlan]
)

object SubscriptionPlan:
    def make(generator: SubscriptionPlanGenerator, subscriptionIndex: SubscriptionIndex): Task[SubscriptionPlan] = for {
        consumerGenerators <- ZIO.foreach(List.range(0, generator.getConsumersCount(subscriptionIndex))) {
            consumerIndex => generator.getConsumerGenerator(consumerIndex)
        }
        consumersAsPairs <- ZIO.foreach(consumerGenerators.zipWithIndex) { case (consumerGenerator, consumerIndex) =>
            for {
                consumerName <- ZIO.succeed(consumerGenerator.getName(consumerIndex))
                _consumerGenerator <- ZIO.succeed(consumerGenerator.focus(_.getName).replace(_ => consumerName))
                consumerPlan <- ConsumerPlan.make(_consumerGenerator, consumerIndex)
            } yield consumerGenerator.getName(consumerIndex) -> consumerPlan
        }
        consumers <- ZIO.succeed(consumersAsPairs.toMap)
        subscriptionPlan <- ZIO.succeed {
            SubscriptionPlan(
                name = generator.getName(subscriptionIndex),
                subscriptionType = generator.getSubscriptionType(subscriptionIndex),
                consumers
            )
        }
    } yield subscriptionPlan

case class SubscriptionPlanGenerator(
    getName: SubscriptionIndex => String,
    getConsumersCount: SubscriptionIndex => Int,
    getSubscriptionType: SubscriptionIndex => SubscriptionType,
    getConsumerGenerator: ConsumerIndex => Task[ConsumerPlanGenerator]
)

object SubscriptionPlanGenerator:
    def make(
        getName: SubscriptionIndex => String = i => s"subscription-$i",
        getConsumersCount: SubscriptionIndex => Int = _ => 3,
        getSubscriptionType: SubscriptionIndex => SubscriptionType = _ => SubscriptionType.Exclusive,
        getConsumerGenerator: ConsumerIndex => Task[ConsumerPlanGenerator] = _ => ConsumerPlanGenerator.make()
    ): Task[SubscriptionPlanGenerator] =
        val subscriptionPlanGenerator = SubscriptionPlanGenerator(
            getName = getName,
            getConsumersCount = getConsumersCount,
            getSubscriptionType = getSubscriptionType,
            getConsumerGenerator = getConsumerGenerator
        )
        ZIO.succeed(subscriptionPlanGenerator)
