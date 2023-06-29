package generators

import zio.*
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import monocle.syntax.all.*
import _root_.client.{adminClient, pulsarClient}

type TopicName = String
type TopicIndex = Int

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

        TopicPlan(
            tenant = generator.getTenant(),
            namespace = generator.getNamespace(),
            name = generator.getName(topicIndex),
            schemaInfo = generator.getSchemaInfo(topicIndex),
            persistency = generator.getPersistency(topicIndex),
            partitioning = generator.getPartitioning(topicIndex),
            producers = producers,
            subscriptions = Map.empty
        )

case class TopicPlanGenerator(
    getTenant: () => String,
    getNamespace: () => String,
    getName: TopicIndex => String,
    getSchemaInfo: TopicIndex => SchemaInfo,
    getProducersCount: TopicIndex => Int,
    getProducerGenerator: ProducerIndex => ProducerPlanGenerator,
    getSubscriptionsCount: TopicIndex => Int,
    getConsumersPerSubscriptionCount: SubscriptionIndex => Int,
    getMessagesPerSecond: ProducerIndex => Int,
    getPayload: MessageIndex => Array[Byte],
    getSubscriptionType: SubscriptionIndex => SubscriptionType,
    getPersistency: TopicIndex => TopicPersistency,
    getPartitioning: TopicIndex => TopicPartitioning
)

object TopicPlanGenerator:
    def make(
        getTenant: () => String = () => "__pulsocat-demo__",
        getNamespace: () => String = () => "default",
        getName: TopicIndex => String = topicIndex => s"topic-$topicIndex",
        getProducersCount: TopicIndex => Int = _ => 1,
        getProducerGenerator: ProducerIndex => ProducerPlanGenerator = _ => ProducerPlanGenerator.make(),
        getSubscriptionsCount: TopicIndex => Int = _ => 1,
        getConsumersPerSubscriptionCount: SubscriptionIndex => Int = _ => 1,
        getMessagesPerSecond: ProducerIndex => Int = _ => 1,
        getPayload: MessageIndex => Array[Byte] = _ => Array.emptyByteArray,
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
            getConsumersPerSubscriptionCount = getConsumersPerSubscriptionCount,
            getMessagesPerSecond = getMessagesPerSecond,
            getPayload = getPayload,
            getSubscriptionType = getSubscriptionType,
            getSchemaInfo = getSchemaInfo,
            getPersistency = getPersistency,
            getPartitioning = getPartitioning
        )

object TopicPlanExecutor:
    def getTopicFqn(topic: TopicPlan): String = topic.persistency match
        case Persistent()    => s"persistent://${topic.tenant}/${topic.namespace}/${topic.name}"
        case NonPersistent() => s"non-persistent://${topic.tenant}/${topic.namespace}/${topic.name}"

    def allocate(topic: TopicPlan): Task[Unit] =
        for {
            topicFqn <- ZIO.attempt(getTopicFqn(topic))
            _ <- ZIO.attempt {
                topic.partitioning match
                    case Partitioned(partitions) => adminClient.topics.createPartitionedTopic(topicFqn, partitions)
                    case NonPartitioned() =>
                        adminClient.topics.createNonPartitionedTopic(topicFqn)
            }
            _ <- ZIO.attempt(adminClient.schemas.createSchema(topicFqn, topic.schemaInfo))
        } yield ()

    def startProduce(topic: TopicPlan) =
        val topicFqn = getTopicFqn(topic)
        ZIO.foreachPar(topic.producers.values.zipWithIndex) { case (producerPlan, producerIndex) =>
            for {
                producer <- ZIO.attempt(
                    pulsarClient.newProducer.producerName(producerPlan.name).topic(topicFqn).create()
                )
                _ <- ZIO
                    .attempt {
                        val payload = producerPlan.getPayload(producerIndex)
                        producer.sendAsync(payload)
                    }
                    .repeat(producerPlan.schedule)
            } yield ()
        }

//    def startConsume() =
//        def makeConsumers(subscriptionName: String, consumersCount: Int) = List.tabulate(consumersCount) { i =>
//            pulsarClient.newConsumer
//                .subscriptionName(subscriptionName)
//                .subscriptionType(getSubscriptionType())
//                .consumerName(s"consumer-$i")
//                .topic(topicFqn)
//                .messageListener((consumer, msg) => consumer.acknowledge(msg))
//        }
//
//        val subscriptions = List.tabulate(getSubscriptionsCount())(i => s"subscription-$i")
//        val consumers = subscriptions
//            .flatMap(subscriptionName => makeConsumers(subscriptionName, getConsumersPerSubscriptionCount()))
//
//        ZIO.foreachPar(consumers)(consumer => ZIO.attempt(consumer.subscribe))
