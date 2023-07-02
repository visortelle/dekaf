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

case class Partitioned(partitions: Int)
case class NonPartitioned()
type TopicPartitioning = Partitioned | NonPartitioned

case class TopicPlan(
    tenant: String,
    namespace: String,
    name: String,
    schemaInfo: SchemaInfo,
    persistency: TopicPersistency,
    partitioning: TopicPartitioning,
    producers: Map[ProducerName, ProducerPlan],
    subscriptions: Map[SubscriptionName, SubscriptionPlan]
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
            schemaInfo = generator.getSchemaInfo(topicIndex),
            persistency = generator.getPersistency(topicIndex),
            partitioning = generator.getPartitioning(topicIndex),
            producers = producers,
            subscriptions = subscriptions
        )

case class TopicPlanGenerator(
    getTenant: () => String,
    getNamespace: () => String,
    getName: TopicIndex => String,
    getSchemaInfo: TopicIndex => SchemaInfo,
    getProducersCount: TopicIndex => Int,
    getProducerGenerator: ProducerIndex => ProducerPlanGenerator,
    getSubscriptionsCount: TopicIndex => Int,
    getSubscriptionGenerator: SubscriptionIndex => SubscriptionPlanGenerator,
    getSubscriptionType: SubscriptionIndex => SubscriptionType,
    getPersistency: TopicIndex => TopicPersistency,
    getPartitioning: TopicIndex => TopicPartitioning
)

object TopicPlanGenerator:
    def make(
        getTenant: () => String = () => "pulsecat_default",
        getNamespace: () => String = () => "pulsocat_default",
        getName: TopicIndex => TopicName = topicIndex => s"topic-${topicIndex}",
        getProducersCount: TopicIndex => Int = _ => 1,
        getProducerGenerator: ProducerIndex => ProducerPlanGenerator = _ => ProducerPlanGenerator.make(),
        getSubscriptionsCount: TopicIndex => Int = _ => 1,
        getSubscriptionGenerator: SubscriptionIndex => SubscriptionPlanGenerator = _ =>
            SubscriptionPlanGenerator.make(),
        getSubscriptionType: SubscriptionIndex => SubscriptionType = _ => SubscriptionType.Exclusive,
        getSchemaInfo: TopicIndex => SchemaInfo = _ => SchemaInfo.builder.name("default").`type`(SchemaType.NONE).build,
        getPersistency: TopicIndex => TopicPersistency = _ => Persistent(),
        getPartitioning: TopicIndex => TopicPartitioning = _ => Partitioned(partitions = 3)
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
            getSchemaInfo = getSchemaInfo,
            getPersistency = getPersistency,
            getPartitioning = getPartitioning
        )

object TopicPlanExecutor:
    private def getTopicFqn(topic: TopicPlan): String = topic.persistency match
        case Persistent()    => s"persistent://${topic.tenant}/${topic.namespace}/${topic.name}"
        case NonPersistent() => s"non-persistent://${topic.tenant}/${topic.namespace}/${topic.name}"

    def allocateResources(topicPlan: TopicPlan): Task[TopicPlan] =
        for {
            topicFqn <- ZIO.attempt(getTopicFqn(topicPlan))
            _ <- ZIO.attempt {
                topicPlan.partitioning match
                    case Partitioned(partitions) => adminClient.topics.createPartitionedTopic(topicFqn, partitions)
                    case NonPartitioned() =>
                        adminClient.topics.createNonPartitionedTopic(topicFqn)
            }
            _ <- ZIO.attempt(adminClient.schemas.createSchema(topicFqn, topicPlan.schemaInfo))
        } yield topicPlan

    private def startProduce(topic: TopicPlan) =
        val topicFqn = getTopicFqn(topic)
        ZIO.foreachPar(topic.producers.values.zipWithIndex) { case (producerPlan, producerIndex) =>
            for {
                producer <- ZIO.attempt({
                  val schema = new AutoProduceBytesSchema[Array[Byte]]
                  pulsarClient.newProducer(schema).producerName(producerPlan.name).topic(topicFqn).create
                })
                _ <- ZIO
                    .attempt {
                        val payload = producerPlan.getPayload(producerIndex)
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
                .messageListener((consumer, msg) => {
                  val value = msg.getValue
                  println(s"VALUE, ${value.foreach(_.toChar)}")
                  consumer.acknowledge(msg)
                })
        }

        val consumers = topic.subscriptions.flatMap { case (_, subscription) =>
            makeConsumers(subscription)
        }

        ZIO.foreachPar(consumers)(consumer => ZIO.attempt(consumer.subscribe))

    def start(topicPlan: TopicPlan): Task[Unit] = for {
        produceFib <- TopicPlanExecutor.startProduce(topicPlan).fork
        _ <- TopicPlanExecutor.startConsume(topicPlan).fork
        _ <- produceFib.join
    } yield ()
