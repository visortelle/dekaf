package generators

import zio.*
import org.apache.pulsar.client.api.{MessageRoutingMode, SubscriptionType}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import monocle.syntax.all.*
import _root_.client.{adminClient, pulsarClient}
import org.apache.pulsar.client.impl.schema.{AutoProduceBytesSchema, JSONSchema}
import scala.jdk.CollectionConverters._

type TopicName = String
type TopicIndex = Int
type MessageIndex = Long

case class Persistent()
case class NonPersistent()
type TopicPersistency = Persistent | NonPersistent

object TopicPersistency:
    def fromString(persistency: String): TopicPersistency = persistency match
        case "persistent"     => Persistent()
        case "non-persistent" => NonPersistent()
    def toString(persistency: TopicPersistency): String = persistency match
        case Persistent()    => "persistent"
        case NonPersistent() => "non-persistent"

case class Partitioned(partitions: Int)
case class NonPartitioned()
type TopicPartitioning = Partitioned | NonPartitioned

case class TopicPlan(
    tenant: String,
    namespace: String,
    name: String,
    schemaInfos: List[SchemaInfo],
    persistency: TopicPersistency,
    partitioning: TopicPartitioning,
    producers: Map[ProducerName, ProducerPlan],
    subscriptions: Map[SubscriptionName, SubscriptionPlan],
    afterAllocation: TopicPlan => Unit
):
  def topicFqn: String = persistency match
    case Persistent() => s"persistent://${tenant}/${namespace}/${name}"
    case NonPersistent() => s"non-persistent://${tenant}/${namespace}/${name}"

object TopicPlan:
    def make: Task[TopicPlan] = ZIO.succeed(
      TopicPlan(
        tenant = "dekaf_default",
        namespace = "dekaf_default",
        name = "dekaf_default",
        schemaInfos = List.empty,
        persistency = Persistent(),
        partitioning = Partitioned(partitions = 3),
        producers = Map.empty,
        subscriptions = Map.empty,
        afterAllocation = _ => ()
      )
    )
    
    def makeProducers()
    
    def make(generator: TopicPlanGenerator, topicIndex: TopicIndex): Task[TopicPlan] = for {
        producerGenerators <- ZIO.foreach(0 until generator.mkProducersCount(topicIndex)) { producerIndex =>
            generator.mkProducerGenerator(producerIndex)
        }
        producersAsPairs <- ZIO.foreach(producerGenerators.zipWithIndex) { case (producerGenerator, producerIndex) =>
            for {
                producerName <- ZIO.succeed(producerGenerator.mkName(producerIndex))
                _producerGenerator <- ZIO.succeed(producerGenerator.focus(_.mkName).replace(_ => producerName))
                producer <- ProducerPlan.make(_producerGenerator, producerIndex)
            } yield producerGenerator.mkName(producerIndex) -> producer
        }
        producers = producersAsPairs.toMap

        subscriptionsAsPairs <- ZIO.foreach(0 until generator.mkSubscriptionsCount(topicIndex)) { subscriptionIndex =>
            for {
                subscriptionGenerator <- generator.mkSubscriptionGenerator(subscriptionIndex)
                subscriptionName <- ZIO.succeed(subscriptionGenerator.mkName(subscriptionIndex))
                _subscriptionGenerator <- ZIO.succeed(
                    subscriptionGenerator.focus(_.mkName).replace(_ => subscriptionName)
                )
                subscription <- SubscriptionPlan.make(_subscriptionGenerator, subscriptionIndex)
            } yield subscriptionGenerator.mkName(subscriptionIndex) -> subscription
        }
        subscriptions = subscriptionsAsPairs.toMap

        topicPlan <- ZIO.succeed(
            TopicPlan(
                tenant = generator.mkTenant(),
                namespace = generator.mkNamespace(),
                name = generator.mkName(topicIndex),
                schemaInfos = generator.mkSchemaInfos(topicIndex),
                persistency = generator.mkPersistency(topicIndex),
                partitioning = generator.mkPartitioning(topicIndex),
                producers = producers,
                subscriptions = subscriptions,
                afterAllocation = generator.mkAfterAllocation(topicIndex)
            )
        )
    } yield topicPlan

case class TopicPlanGenerator(
    mkTenant: () => String,
    mkNamespace: () => String,
    mkName: TopicIndex => String,
    mkSchemaInfos: TopicIndex => List[SchemaInfo],
    mkProducersCount: TopicIndex => Int,
    mkProducerGenerator: ProducerIndex => Task[ProducerPlanGenerator],
    mkSubscriptionsCount: TopicIndex => Int,
    mkSubscriptionGenerator: SubscriptionIndex => Task[SubscriptionPlanGenerator],
    mkSubscriptionType: SubscriptionIndex => SubscriptionType,
    mkPersistency: TopicIndex => TopicPersistency,
    mkPartitioning: TopicIndex => TopicPartitioning,
    mkAfterAllocation: TopicIndex => TopicPlan => Unit
)

object TopicPlanGenerator:
    def make(
        mkTenant: () => String = () => "pulsecat_default",
        mkNamespace: () => String = () => "dekaf_default",
        mkName: TopicIndex => TopicName = topicIndex => s"topic-$topicIndex",
        mkProducersCount: TopicIndex => Int = _ => 1,
        mkProducerGenerator: ProducerIndex => Task[ProducerPlanGenerator] = _ => ProducerPlanGenerator.make(),
        mkSubscriptionsCount: TopicIndex => Int = _ => 1,
        mkSubscriptionGenerator: SubscriptionIndex => Task[SubscriptionPlanGenerator] = _ =>
            SubscriptionPlanGenerator.make(),
        mkSubscriptionType: SubscriptionIndex => SubscriptionType = _ => SubscriptionType.Exclusive,
        mkSchemaInfos: TopicIndex => List[SchemaInfo] = _ => List.empty,
        mkPersistency: TopicIndex => TopicPersistency = _ => Persistent(),
        mkPartitioning: TopicIndex => TopicPartitioning = _ => Partitioned(partitions = 3),
        mkAfterAllocation: TopicIndex => TopicPlan => Unit = _ => _ => ()
    ): Task[TopicPlanGenerator] =
        val topicPlanGenerator = TopicPlanGenerator(
            mkTenant = mkTenant,
            mkNamespace = mkNamespace,
            mkName = mkName,
            mkProducersCount = mkProducersCount,
            mkProducerGenerator = mkProducerGenerator,
            mkSubscriptionsCount = mkSubscriptionsCount,
            mkSubscriptionGenerator = mkSubscriptionGenerator,
            mkSubscriptionType = mkSubscriptionType,
            mkSchemaInfos = mkSchemaInfos,
            mkPersistency = mkPersistency,
            mkPartitioning = mkPartitioning,
            mkAfterAllocation = mkAfterAllocation
        )

        ZIO.succeed(topicPlanGenerator)

object TopicPlanExecutor:
    private def mkTopicFqn(topic: TopicPlan): String = topic.persistency match
        case Persistent()    => s"persistent://${topic.tenant}/${topic.namespace}/${topic.name}"
        case NonPersistent() => s"non-persistent://${topic.tenant}/${topic.namespace}/${topic.name}"

    def allocateResources(topicPlan: TopicPlan): Task[TopicPlan] =
        for {
            _ <- ZIO.logInfo(s"Allocating resources for topic ${topicPlan.name}")
            topicFqn <- ZIO.attempt(topicPlan.topicFqn)
            _ <- ZIO.attempt {
                topicPlan.partitioning match
                    case Partitioned(partitions) => adminClient.topics.createPartitionedTopic(topicFqn, partitions)
                    case NonPartitioned() =>
                        adminClient.topics.createNonPartitionedTopic(topicFqn)
            }
            _ <- ZIO.foreachDiscard(topicPlan.schemaInfos) { schemaInfo =>
                ZIO.attempt(adminClient.schemas.createSchema(topicFqn, schemaInfo))
            }
            _ <- ZIO.attempt(topicPlan.afterAllocation(topicPlan))
        } yield topicPlan

    private def startConsume(topic: TopicPlan): Task[Unit] =
        val topicFqn = topic.topicFqn

        def makeConsumers(subscription: SubscriptionPlan) = subscription.consumers.map { case (_, consumer) =>
            pulsarClient.newConsumer
                .subscriptionName(subscription.name)
                .subscriptionType(subscription.subscriptionType)
                .consumerName(consumer.name)
                .topic(topicFqn)
                .messageListener((consumer, msg) => consumer.acknowledge(msg))
        }

        val consumers = topic.subscriptions.flatMap { case (_, subscription) =>
            makeConsumers(subscription)
        }

        ZIO.foreachParDiscard(consumers)(consumer =>
            for {
                c <- ZIO.attempt(consumer.subscribe)
                _ <- ZIO.logInfo(s"Started consumer ${c.getConsumerName} for topic ${topic.name}")
            } yield ()
        )

    def start(topicPlan: TopicPlan): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Starting topic ${topicPlan.name}")
        produceFib <- ProducerPlanExecutor.startProduce(topicPlan).fork
        _ <- TopicPlanExecutor.startConsume(topicPlan).fork
        _ <- produceFib.join
    } yield ()
