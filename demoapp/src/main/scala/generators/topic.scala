package generators

import zio.*
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import monocle.syntax.all.*
import _root_.client.{adminClient, pulsarClient}
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema

type TopicName = String
type TopicIndex = Int
type MessageIndex = Double

case class Persistent()
case class NonPersistent()
type TopicPersistency = Persistent | NonPersistent

object TopicPersistency:
    def fromString(persistency: String): TopicPersistency = persistency match
        case "persistent"    => Persistent()
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
)

object TopicPlan:
    def make(generator: TopicPlanGenerator, topicIndex: TopicIndex): TopicPlan =
        val producerGenerators =
            List.tabulate(generator.getProducersCount(topicIndex))(i => generator.getProducerGenerator(i))

        val producers = producerGenerators.zipWithIndex.map { case (producerGenerator, i) =>
            val producerName = producerGenerator.getName(i)
            val _producerGenerator = producerGenerator.focus(_.getName).replace(_ => producerName)
            producerGenerator.getName(i) -> ProducerPlan.make(_producerGenerator, i)
        }.toMap

        val subscriptionGenerators =
            List.tabulate(generator.getSubscriptionsCount(topicIndex))(i => generator.getSubscriptionGenerator(i))

        val subscriptions = subscriptionGenerators.zipWithIndex.map { case (subscriptionGenerator, i) =>
            val subscriptionName = subscriptionGenerator.getName(i)
            val _subscriptionGenerator = subscriptionGenerator.focus(_.getName).replace(_ => subscriptionName)
            subscriptionGenerator.getName(i) -> SubscriptionPlan.make(_subscriptionGenerator, i)
        }.toMap

        TopicPlan(
            tenant = generator.getTenant(),
            namespace = generator.getNamespace(),
            name = generator.getName(topicIndex),
            schemaInfos = generator.getSchemaInfos(topicIndex),
            persistency = generator.getPersistency(topicIndex),
            partitioning = generator.getPartitioning(topicIndex),
            producers = producers,
            subscriptions = subscriptions,
            afterAllocation = generator.getAfterAllocation(topicIndex)
        )

case class TopicPlanGenerator(
    getTenant: () => String,
    getNamespace: () => String,
    getName: TopicIndex => String,
    getSchemaInfos: TopicIndex => List[SchemaInfo],
    getProducersCount: TopicIndex => Int,
    getProducerGenerator: ProducerIndex => ProducerPlanGenerator,
    getSubscriptionsCount: TopicIndex => Int,
    getSubscriptionGenerator: SubscriptionIndex => SubscriptionPlanGenerator,
    getSubscriptionType: SubscriptionIndex => SubscriptionType,
    getPersistency: TopicIndex => TopicPersistency,
    getPartitioning: TopicIndex => TopicPartitioning,
    getAfterAllocation: TopicIndex => TopicPlan => Unit
)

object TopicPlanGenerator:
    def make(
        getTenant: () => String = () => "pulsecat_default",
        getNamespace: () => String = () => "pulsocat_default",
        getName: TopicIndex => TopicName = topicIndex => s"topic-$topicIndex",
        getProducersCount: TopicIndex => Int = _ => 1,
        getProducerGenerator: ProducerIndex => ProducerPlanGenerator = _ => ProducerPlanGenerator.make(),
        getSubscriptionsCount: TopicIndex => Int = _ => 1,
        getSubscriptionGenerator: SubscriptionIndex => SubscriptionPlanGenerator = _ =>
            SubscriptionPlanGenerator.make(),
        getSubscriptionType: SubscriptionIndex => SubscriptionType = _ => SubscriptionType.Exclusive,
        getSchemaInfos: TopicIndex => List[SchemaInfo] = _ => List.empty,
        getPersistency: TopicIndex => TopicPersistency = _ => Persistent(),
        getPartitioning: TopicIndex => TopicPartitioning = _ => Partitioned(partitions = 3),
        getAfterAllocation: TopicIndex => TopicPlan => Unit = _ => _ => ()
    ): TopicPlanGenerator =
        TopicPlanGenerator(
            getTenant = getTenant,
            getNamespace = getNamespace,
            getName = getName,
            getProducersCount = getProducersCount,
            getProducerGenerator = getProducerGenerator,
            getSubscriptionsCount = getSubscriptionsCount,
            getSubscriptionGenerator = getSubscriptionGenerator,
            getSubscriptionType = getSubscriptionType,
            getSchemaInfos = getSchemaInfos,
            getPersistency = getPersistency,
            getPartitioning = getPartitioning,
            getAfterAllocation = getAfterAllocation
        )

object TopicPlanExecutor:
    private def getTopicFqn(topic: TopicPlan): String = topic.persistency match
        case Persistent()    => s"persistent://${topic.tenant}/${topic.namespace}/${topic.name}"
        case NonPersistent() => s"non-persistent://${topic.tenant}/${topic.namespace}/${topic.name}"

    def allocateResources(topicPlan: TopicPlan): Task[TopicPlan] =
        for {
            _ <- ZIO.logInfo(s"Allocating resources for topic ${topicPlan.name}")
            topicFqn <- ZIO.attempt(getTopicFqn(topicPlan))
            _ <- ZIO.attempt {
                topicPlan.partitioning match
                    case Partitioned(partitions) => adminClient.topics.createPartitionedTopic(topicFqn, partitions)
                    case NonPartitioned() =>
                        adminClient.topics.createNonPartitionedTopic(topicFqn)
            }
            _ <- ZIO.foreachDiscard(topicPlan.schemaInfos)(schemaInfo => {
              ZIO.attempt(adminClient.schemas.createSchema(topicFqn, schemaInfo))
            })
            _ <- ZIO.attempt(topicPlan.afterAllocation(topicPlan))
        } yield topicPlan

    private def startProduce(topic: TopicPlan) =
        val topicFqn = getTopicFqn(topic)
        ZIO.foreachPar(topic.producers.values.zipWithIndex) { case (producerPlan, producerIndex) =>
            for {
                producer <- ZIO.attempt {
                    val schema = new AutoProduceBytesSchema[Array[Byte]]
                    pulsarClient.newProducer(schema).producerName(producerPlan.name).topic(topicFqn).create
                }
                _ <- ZIO.logInfo(s"Started producer ${producerPlan.name} for topic ${topic.name}")
                _ <- ZIO
                    .attempt {
                        val payload = producerPlan.getPayload(producerPlan.messageIndex)
                        producerPlan.messageIndex += 1
                        producer.newMessage.value(payload).sendAsync
                    }
                    .repeat(producerPlan.schedule)
            } yield ()
        }

    private def startConsume(topic: TopicPlan) =
        val topicFqn = getTopicFqn(topic)

        def makeConsumers(subscription: SubscriptionPlan) = subscription.consumers.map { case (_, consumer) =>
            pulsarClient.newConsumer
                .subscriptionName(subscription.name)
                .subscriptionType(subscription.subscriptionType)
                .consumerName(consumer.name)
                .topic(topicFqn)
                .messageListener { (consumer, msg) =>
                    consumer.acknowledge(msg)
                }
        }

        val consumers = topic.subscriptions.flatMap { case (_, subscription) =>
            makeConsumers(subscription)
        }

        ZIO.foreachPar(consumers)(consumer =>
            for {
                c <- ZIO.attempt(consumer.subscribe)
                _ <- ZIO.logInfo(s"Started consumer ${c.getConsumerName} for topic ${topic.name}")
            } yield ()
        )

    def start(topicPlan: TopicPlan): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Starting topic ${topicPlan.name}")
        produceFib <- TopicPlanExecutor.startProduce(topicPlan).fork
        _ <- TopicPlanExecutor.startConsume(topicPlan).fork
        _ <- produceFib.join
    } yield ()
