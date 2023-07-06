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
        consumerGenerators <- ZIO.foreach(List.range(0, generator.mkConsumersCount(subscriptionIndex))) {
            consumerIndex => generator.mkConsumerGenerator(consumerIndex)
        }
        consumersAsPairs <- ZIO.foreach(consumerGenerators.zipWithIndex) { case (consumerGenerator, consumerIndex) =>
            for {
                consumerName <- ZIO.succeed(consumerGenerator.mkName(consumerIndex))
                _consumerGenerator <- ZIO.succeed(consumerGenerator.focus(_.mkName).replace(_ => consumerName))
                consumerPlan <- ConsumerPlan.make(_consumerGenerator, consumerIndex)
            } yield consumerGenerator.mkName(consumerIndex) -> consumerPlan
        }
        consumers <- ZIO.succeed(consumersAsPairs.toMap)
        subscriptionPlan <- ZIO.succeed {
            SubscriptionPlan(
                name = generator.mkName(subscriptionIndex),
                subscriptionType = generator.mkSubscriptionType(subscriptionIndex),
                consumers
            )
        }
    } yield subscriptionPlan

case class SubscriptionPlanGenerator(
    mkName: SubscriptionIndex => String,
    mkConsumersCount: SubscriptionIndex => Int,
    mkSubscriptionType: SubscriptionIndex => SubscriptionType,
    mkConsumerGenerator: ConsumerIndex => Task[ConsumerPlanGenerator]
)

object SubscriptionPlanGenerator:
    def make(
        mkName: SubscriptionIndex => String = i => s"subscription-$i",
        mkConsumersCount: SubscriptionIndex => Int = _ => 3,
        mkSubscriptionType: SubscriptionIndex => SubscriptionType = _ => SubscriptionType.Exclusive,
        mkConsumerGenerator: ConsumerIndex => Task[ConsumerPlanGenerator] = _ => ConsumerPlanGenerator.make()
    ): Task[SubscriptionPlanGenerator] =
        val subscriptionPlanGenerator = SubscriptionPlanGenerator(
            mkName = mkName,
            mkConsumersCount = mkConsumersCount,
            mkSubscriptionType = mkSubscriptionType,
            mkConsumerGenerator = mkConsumerGenerator
        )
        ZIO.succeed(subscriptionPlanGenerator)
