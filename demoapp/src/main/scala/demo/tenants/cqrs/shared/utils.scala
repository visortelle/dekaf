package demo.tenants.cqrs.shared

import _root_.generators.*
import _root_.demo.tenants.cqrs.shared.{faker, Message as MessageDto}
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.schema.SchemaInfo
import zio.{Duration, Schedule}

def mkConfigurableTopicPlanGenerator[T <: MessageDto](
  mkTenant: () => TenantName = () => "dekaf_default",
  mkNamespace: () => NamespaceName = () => "dekaf_default",
  mkName: TopicIndex => TopicName = i => s"topic-$i",
  mkLoadType: TopicIndex => DemoappTopicConfig.LoadType,
  mkSubscriptionType: SubscriptionIndex => SubscriptionType,
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
        mkSchedule = i => Schedule.fixed(
          Duration.fromMillis(
            mkLoadType(i) match
              case DemoappTopicConfig.Overloaded => DemoappTopicConfig.ScheduleTime.overloadedTopic
              case DemoappTopicConfig.HeavilyLoaded => DemoappTopicConfig.ScheduleTime.heavilyLoadedTopic
              case DemoappTopicConfig.ModeratelyLoaded => DemoappTopicConfig.ScheduleTime.moderatelyLoadedTopic
              case DemoappTopicConfig.LightlyLoaded => DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
    mkSchemaInfos = _ => List(schemaInfo),
    mkPartitioning = mkDefaultTopicPartitioning,
    mkPersistency = mkDefaultPersistency,
    mkSubscriptionsCount = i => mkLoadType(i) match
      case DemoappTopicConfig.Overloaded => DemoappTopicConfig.SubscriptionAmount.overloadedTopic
      case DemoappTopicConfig.HeavilyLoaded => DemoappTopicConfig.SubscriptionAmount.heavilyLoadedTopic
      case DemoappTopicConfig.ModeratelyLoaded => DemoappTopicConfig.SubscriptionAmount.moderatelyLoadedTopic
      case DemoappTopicConfig.LightlyLoaded => DemoappTopicConfig.SubscriptionAmount.lightlyLoadedTopic
    ,
    mkSubscriptionType = mkSubscriptionType,
    mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
      mkSubscriptionType = mkSubscriptionType,
      mkConsumersCount = i => mkLoadType(i) match
        case DemoappTopicConfig.Overloaded => DemoappTopicConfig.ConsumerAmount.overloadedTopic
        case DemoappTopicConfig.HeavilyLoaded => DemoappTopicConfig.ConsumerAmount.heavilyLoadedTopic
        case DemoappTopicConfig.ModeratelyLoaded => DemoappTopicConfig.ConsumerAmount.moderatelyLoadedTopic
        case DemoappTopicConfig.LightlyLoaded => DemoappTopicConfig.ConsumerAmount.lightlyLoadedTopic
      ,
      mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
        mkName = i => s"${mkName(i)}Consumer-$i",
      )
    )
  )


def mkDefaultTopicPartitioning: TopicIndex => TopicPartitioning =
  if (faker.number().randomDouble(2, 0, 1) > 0.8 && DemoappTopicConfig.enablePartitionedTopics) then
    _ => Partitioned(faker.number().numberBetween(1, 10))
  else
    _ => NonPartitioned()

def mkDefaultPersistency: TopicIndex => TopicPersistency =
  if (faker.number().randomDouble(2, 0, 1) > 0.8 && DemoappTopicConfig.enableNonPersistentTopics) then
    _ => NonPersistent()
  else
    _ => Persistent()
