package demo.tenants.cqrs.shared

import _root_.generators.*
import _root_.demo.tenants.cqrs.shared.faker
import com.google.protobuf.GeneratedMessageV3
import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap
import demo.tenants.cqrs.model.{Message as MessageDto, Randomizable, Schemable}
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.schema.SchemaInfo
import org.apache.pulsar.client.api as pulsarClientApi
import zio.{Duration, Schedule, Task}

import java.util.UUID
import scala.jdk.CollectionConverters.*
import scala.annotation.tailrec
import scala.util.Random

def mkConfigurableTopicPlanGenerator[T <: MessageDto](
    mkTenant: () => TenantName = () => "dekaf_default",
    mkNamespace: () => NamespaceName = () => "dekaf_default",
    mkName: TopicIndex => TopicName = i => s"topic-$i",
    mkLoadType: TopicIndex => DemoAppTopicConfig.LoadType,
    mkSubscriptionType: SubscriptionIndex => SubscriptionType
)(using rn: Randomizable[T], sch: Schemable[T]) =
    val schemaInfo = MessageDto.schema[T].getSchemaInfo

    TopicPlanGenerator.make(
        mkTenant = mkTenant,
        mkName = mkName,
        mkNamespace = mkNamespace,
        mkProducersCount = i => 1,
        mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
                mkName = i => s"${mkName(i)}Producer-$i",
                mkMessage = _ => _ => Message(Serde.toJsonBytes(MessageDto.random[T])),
                mkSchedule = i =>
                    Schedule.fixed(
                        Duration.fromMillis(
                            mkLoadType(i) match
                                case DemoAppTopicConfig.Overloaded => DemoAppTopicConfig.ScheduleTime.overloadedTopic
                                case DemoAppTopicConfig.HeavilyLoaded =>
                                    DemoAppTopicConfig.ScheduleTime.heavilyLoadedTopic
                                case DemoAppTopicConfig.ModeratelyLoaded =>
                                    DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
                                case DemoAppTopicConfig.LightlyLoaded =>
                                    DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
                        )
                    )
            ),
        mkSchemaInfos = _ => List(schemaInfo),
        mkPartitioning = mkDefaultTopicPartitioning,
        mkPersistency = mkDefaultPersistency,
        mkSubscriptionsCount = i =>
            mkLoadType(i) match
                case DemoAppTopicConfig.Overloaded       => DemoAppTopicConfig.SubscriptionAmount.overloadedTopic
                case DemoAppTopicConfig.HeavilyLoaded    => DemoAppTopicConfig.SubscriptionAmount.heavilyLoadedTopic
                case DemoAppTopicConfig.ModeratelyLoaded => DemoAppTopicConfig.SubscriptionAmount.moderatelyLoadedTopic
                case DemoAppTopicConfig.LightlyLoaded    => DemoAppTopicConfig.SubscriptionAmount.lightlyLoadedTopic
        ,
        mkSubscriptionType = mkSubscriptionType,
        mkSubscriptionGenerator = _ =>
            SubscriptionPlanGenerator.make(
                mkSubscriptionType = mkSubscriptionType,
                mkConsumersCount = i =>
                    mkLoadType(i) match
                        case DemoAppTopicConfig.Overloaded    => DemoAppTopicConfig.ConsumerAmount.overloadedTopic
                        case DemoAppTopicConfig.HeavilyLoaded => DemoAppTopicConfig.ConsumerAmount.heavilyLoadedTopic
                        case DemoAppTopicConfig.ModeratelyLoaded =>
                            DemoAppTopicConfig.ConsumerAmount.moderatelyLoadedTopic
                        case DemoAppTopicConfig.LightlyLoaded => DemoAppTopicConfig.ConsumerAmount.lightlyLoadedTopic
                ,
                mkConsumerGenerator = _ =>
                    ConsumerPlanGenerator.make(
                        mkName = i => s"${mkName(i)}Consumer-$i"
                    )
            )
    )

def mkSubscriptionPlan(name: SubscriptionName) = for {
    subscriptionPlanGenerator <- SubscriptionPlanGenerator.make(
        mkName = _ => name,
        mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared
    )
    subscriptionPlan <- SubscriptionPlan.make(subscriptionPlanGenerator, 0)
} yield subscriptionPlan

def mkTopicPlan(topicPlanGenerator: Task[TopicPlanGenerator], topicIndex: TopicIndex) = for {
    topicPlanGenerator <- topicPlanGenerator
    topicPlan <- TopicPlan.make(topicPlanGenerator, topicIndex)
} yield topicPlan

@tailrec
def pickId(iterator: Iterator[UUID], index: Int, current: Option[UUID] = None): Option[UUID] =
    if (!iterator.hasNext) current
    else if (index == 0) Some(iterator.next())
    else {
        val nextElement = iterator.next()
        pickId(iterator, index - 1, Some(nextElement))
    }

def mkMessageWithRandomKeyFromMap[T <: GeneratedMessageV3](
    aggregatesKeys: ConcurrentLinkedHashMap[UUID, _],
    mkMessageValue: UUID => T
): Message =
    mkRandomKeyFromMap(aggregatesKeys) match
        case None => Message(Array.emptyByteArray, Some(""))
        case Some(aggregateKey) =>
            val value = mkMessageValue(UUID.fromString(aggregateKey.toString))
            val payload = Serde.toProto(value)
            Message(payload, Some(aggregateKey.toString))

def mkRandomKeyFromMap(aggregatesKeys: ConcurrentLinkedHashMap[UUID, _]): Option[UUID] =
    aggregatesKeys.keySet() match
        case keys if keys.isEmpty => None
        case keys =>
            val iterator = keys.iterator().asScala
            val randomIndex = Random.nextInt(keys.size)

            pickId(iterator, randomIndex)

def mkDefaultTopicPartitioning: TopicIndex => TopicPartitioning =
    if faker.number().randomDouble(2, 0, 1) > 0.8 && DemoAppTopicConfig.enablePartitionedTopics then
        _ => Partitioned(faker.number().numberBetween(1, 10))
    else _ => NonPartitioned()

def mkDefaultPersistency: TopicIndex => TopicPersistency =
    if faker.number().randomDouble(2, 0, 1) > 0.8 && DemoAppTopicConfig.enableNonPersistentTopics then
        _ => NonPersistent()
    else _ => Persistent()
