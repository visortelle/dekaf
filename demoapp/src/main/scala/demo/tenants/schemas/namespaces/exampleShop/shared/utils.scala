package demo.tenants.schemas.namespaces.exampleShop.shared

import _root_.demo.tenants.schemas.namespaces.{TopicConfig, mkDefaultPersistency, mkDefaultTopicPartitioning}
import _root_.generators.*
import demo.tenants.schemas.namespaces.exampleShop.shared.{Message, Randomizable, Schemable}
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.schema.SchemaInfo
import zio.{Duration, Schedule}

def mkConfigurableTopicPlanGenerator[T <: Message](
  mkTenant: () => TenantName = () => "dekaf_default",
  mkNamespace: () => NamespaceName = () => "dekaf_default",
  mkName: TopicIndex => TopicName = i => s"topic-$i",
  mkLoadType: TopicIndex => TopicConfig.LoadType,
  mkSubscriptionType: SubscriptionIndex => SubscriptionType,
)(using rn: Randomizable[T], sch: Schemable[T]) =
  val payloadMessage = Message.random[T]
  val schemaInfo = Message.schema[T].getSchemaInfo

  TopicPlanGenerator.make(
    mkTenant = mkTenant,
    mkName = mkName,
    mkNamespace = mkNamespace,
    mkProducersCount = i => mkLoadType(i) match
      case TopicConfig.Overloaded => TopicConfig.ProducerAmount.overloadedTopic
      case TopicConfig.HeavilyLoaded => TopicConfig.ProducerAmount.heavilyLoadedTopic
      case TopicConfig.ModeratelyLoaded => TopicConfig.ProducerAmount.moderatelyLoadedTopic
      case TopicConfig.LightlyLoaded => TopicConfig.ProducerAmount.lightlyLoadedTopic
    ,
    mkProducerGenerator = _ =>
      ProducerPlanGenerator.make(
        mkName = i => s"${mkName(i)}Producer-$i",
        mkPayload = _ => _ => Encoders.toJson(payloadMessage),
        mkSchedule = i => Schedule.fixed(
          Duration.fromMillis(
            mkLoadType(i) match
              case TopicConfig.Overloaded => TopicConfig.ScheduleTime.overloadedTopic
              case TopicConfig.HeavilyLoaded => TopicConfig.ScheduleTime.heavilyLoadedTopic
              case TopicConfig.ModeratelyLoaded => TopicConfig.ScheduleTime.moderatelyLoadedTopic
              case TopicConfig.LightlyLoaded => TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
    mkSchemaInfos = _ => List(schemaInfo),
    mkPartitioning = mkDefaultTopicPartitioning,
    mkPersistency = mkDefaultPersistency,
    mkSubscriptionsCount = i => mkLoadType(i) match
      case TopicConfig.Overloaded => TopicConfig.SubscriptionAmount.overloadedTopic
      case TopicConfig.HeavilyLoaded => TopicConfig.SubscriptionAmount.heavilyLoadedTopic
      case TopicConfig.ModeratelyLoaded => TopicConfig.SubscriptionAmount.moderatelyLoadedTopic
      case TopicConfig.LightlyLoaded => TopicConfig.SubscriptionAmount.lightlyLoadedTopic
    ,
    mkSubscriptionType = mkSubscriptionType,
    mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
      mkSubscriptionType = mkSubscriptionType,
      mkConsumersCount = i => mkLoadType(i) match
        case TopicConfig.Overloaded => TopicConfig.ConsumerAmount.overloadedTopic
        case TopicConfig.HeavilyLoaded => TopicConfig.ConsumerAmount.heavilyLoadedTopic
        case TopicConfig.ModeratelyLoaded => TopicConfig.ConsumerAmount.moderatelyLoadedTopic
        case TopicConfig.LightlyLoaded => TopicConfig.ConsumerAmount.lightlyLoadedTopic
      ,
      mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
        mkName = i => s"${mkName(i)}Consumer-$i",
      )
    )
  )

def mkKeySharedTopicPlanGenerator(
  mkTenant: () => TenantName = () => "dekaf_default",
  mkNamespace: () => NamespaceName = () => "dekaf_default",
  mkName: TopicIndex => TopicName = i => s"topic-$i",
  mkLoadType: TopicIndex => TopicConfig.LoadType,
  mkProducersCount: TopicIndex => Int,
  mkProducerPlanGenerator: TopicIndex => zio.Task[ProducerPlanGenerator],
  mkSchemaInfos: TopicIndex => List[SchemaInfo],
) =
  TopicPlanGenerator.make(
    mkTenant = mkTenant,
    mkName = mkName,
    mkNamespace = mkNamespace,
    mkProducersCount = mkProducersCount,
    mkProducerGenerator = mkProducerPlanGenerator,
    mkSchemaInfos = mkSchemaInfos,
    mkPartitioning = mkDefaultTopicPartitioning,
    mkPersistency = mkDefaultPersistency,
    mkSubscriptionsCount = i => mkLoadType(i) match
      case TopicConfig.Overloaded => TopicConfig.SubscriptionAmount.overloadedTopic
      case TopicConfig.HeavilyLoaded => TopicConfig.SubscriptionAmount.heavilyLoadedTopic
      case TopicConfig.ModeratelyLoaded => TopicConfig.SubscriptionAmount.moderatelyLoadedTopic
      case TopicConfig.LightlyLoaded => TopicConfig.SubscriptionAmount.lightlyLoadedTopic
    ,
    mkSubscriptionType = _ => SubscriptionType.Key_Shared,
    mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
      mkSubscriptionType = _ => SubscriptionType.Key_Shared,
      mkConsumersCount = i => mkLoadType(i) match
        case TopicConfig.Overloaded => TopicConfig.ConsumerAmount.overloadedTopic
        case TopicConfig.HeavilyLoaded => TopicConfig.ConsumerAmount.heavilyLoadedTopic
        case TopicConfig.ModeratelyLoaded => TopicConfig.ConsumerAmount.moderatelyLoadedTopic
        case TopicConfig.LightlyLoaded => TopicConfig.ConsumerAmount.lightlyLoadedTopic
      ,
      mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
        mkName = i => s"${mkName(i)}Consumer-$i",
      )
    )
  )
