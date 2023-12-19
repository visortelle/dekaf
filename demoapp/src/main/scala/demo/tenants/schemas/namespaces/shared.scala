package demo.tenants.schemas.namespaces

import generators.{NonPartitioned, Partitioned, TopicIndex, TopicPartitioning, TopicPersistency, Persistent, NonPersistent}
import net.datafaker.Faker
import _root_.client.config
import _root_.config.defaultConfig

val faker = new Faker()

object TopicConfig:
  sealed trait LoadType
  case object Overloaded extends LoadType
  case object HeavilyLoaded extends LoadType
  case object ModeratelyLoaded extends LoadType
  case object LightlyLoaded extends LoadType

  val enableNonPersistentTopics: Boolean = config.loadConfig.flatMap(_.enableNonPersistentTopics).getOrElse(true)
  val enablePartitionedTopics: Boolean = config.loadConfig.flatMap(_.enablePartitionedTopics).getOrElse(true)
  object ProducerLoadMultipliers:
    val producerLoadMultipliersConfig = config.loadConfig
      .flatMap(_.producerLoadMultiplier)
      .getOrElse(defaultConfig.loadConfig.get.producerLoadMultiplier.get)

    val baseMultiplier: Double = producerLoadMultipliersConfig.baseMultiplier.getOrElse(1.0)
    val overloadedMultiplier: Double = producerLoadMultipliersConfig.overloaded.getOrElse(1.0)
    val heavilyLoadedMultiplier: Double = producerLoadMultipliersConfig.heavilyLoaded.getOrElse(1.0)
    val moderatelyLoadedMultiplier: Double = producerLoadMultipliersConfig.moderatelyLoaded.getOrElse(1.0)
    val lightlyLoadedMultiplier: Double = producerLoadMultipliersConfig.lightlyLoaded.getOrElse(1.0)

  object ScheduleTime:
    import ProducerLoadMultipliers._

    val overloadedTopic: Long =
      (50.0 / baseMultiplier * overloadedMultiplier)
        .asInstanceOf[Number]
        .longValue()

    val heavilyLoadedTopic: Long =
      (100.0 / baseMultiplier * heavilyLoadedMultiplier)
        .asInstanceOf[Number]
        .longValue()

    val moderatelyLoadedTopic: Long =
      (500.0 / baseMultiplier * moderatelyLoadedMultiplier)
        .asInstanceOf[Number]
        .longValue()

    val lightlyLoadedTopic: Long =
      (1000.0 / baseMultiplier * lightlyLoadedMultiplier)
        .asInstanceOf[Number]
        .longValue()

  object SubscriptionAmount:
    private val subscriptionAmountConfig = config.loadConfig
      .flatMap(_.subscriptionAmount)
      .getOrElse(defaultConfig.loadConfig.get.subscriptionAmount.get)

    val overloadedTopic: Int =
      subscriptionAmountConfig.overloaded.getOrElse(faker.number().numberBetween(1, 5))
    val heavilyLoadedTopic: Int =
      subscriptionAmountConfig.heavilyLoaded.getOrElse(faker.number().numberBetween(1, 5))
    val moderatelyLoadedTopic: Int =
      subscriptionAmountConfig.moderatelyLoaded.getOrElse(faker.number().numberBetween(1, 5))
    val lightlyLoadedTopic: Int =
      subscriptionAmountConfig.lightlyLoaded.getOrElse(faker.number().numberBetween(1, 5))

  object ConsumerAmount:
    private val consumersAmountConfig = config.loadConfig
      .flatMap(_.consumersAmount)
      .getOrElse(defaultConfig.loadConfig.get.consumersAmount.get)

    val overloadedTopic: Int =
      consumersAmountConfig.overloaded.getOrElse(faker.number().numberBetween(1, 10))
    val heavilyLoadedTopic: Int =
      consumersAmountConfig.heavilyLoaded.getOrElse(faker.number().numberBetween(1, 10))
    val moderatelyLoadedTopic: Int =
      consumersAmountConfig.moderatelyLoaded.getOrElse(faker.number().numberBetween(1, 10))
    val lightlyLoadedTopic: Int =
      consumersAmountConfig.lightlyLoaded.getOrElse(faker.number().numberBetween(1, 10))

  object ProducerAmount:
    private val producersAmountConfig = config.loadConfig
      .flatMap(_.producersAmount)
      .getOrElse(defaultConfig.loadConfig.get.producersAmount.get)

    val overloadedTopic: Int = producersAmountConfig.overloaded.getOrElse(1)
    val heavilyLoadedTopic: Int = producersAmountConfig.heavilyLoaded.getOrElse(1)
    val moderatelyLoadedTopic: Int = producersAmountConfig.moderatelyLoaded.getOrElse(1)
    val lightlyLoadedTopic: Int = producersAmountConfig.lightlyLoaded.getOrElse(1)

def mkDefaultTopicPartitioning: TopicIndex => TopicPartitioning =
  if (faker.number().randomDouble(2, 0, 1) > 0.8 && TopicConfig.enablePartitionedTopics) then
    _ => Partitioned(faker.number().numberBetween(1, 10))
  else
    _ => NonPartitioned()

def mkDefaultPersistency: TopicIndex => TopicPersistency =
  if (faker.number().randomDouble(2, 0, 1) > 0.8 && TopicConfig.enableNonPersistentTopics) then
    _ => NonPersistent()
  else
    _ => Persistent()
