package demo.tenants.cqrs.shared

import _root_.client.config
import _root_.config.defaultConfig
import net.datafaker.Faker
import zio.{Duration, ZIO}

val faker = new Faker()

object DemoAppTopicConfig:
  sealed trait LoadType
  case object Overloaded extends LoadType
  case object HeavilyLoaded extends LoadType
  case object ModeratelyLoaded extends LoadType
  case object LightlyLoaded extends LoadType

  val enableNonPersistentTopics: Boolean = config.demoAppConfig.flatMap(_.enableNonPersistentTopics).getOrElse(true)
  val enablePartitionedTopics: Boolean = config.demoAppConfig.flatMap(_.enablePartitionedTopics).getOrElse(true)

  val workersAmount: Int = config.demoAppConfig.flatMap(_.workersAmount).getOrElse(faker.number().numberBetween(1, 10))

  private object ProducerLoadMultipliers:
    private val producerLoadMultipliersConfig = config.demoAppConfig
      .flatMap(_.producerLoadMultiplier)
      .getOrElse(defaultConfig.demoAppConfig.get.producerLoadMultiplier.get)

    val baseMultiplier: Double = producerLoadMultipliersConfig.baseMultiplier.getOrElse(1.0)
    val overloadedMultiplier: Double = producerLoadMultipliersConfig.overloaded.getOrElse(1.0)
    val heavilyLoadedMultiplier: Double = producerLoadMultipliersConfig.heavilyLoaded.getOrElse(1.0)
    val moderatelyLoadedMultiplier: Double = producerLoadMultipliersConfig.moderatelyLoaded.getOrElse(1.0)
    val lightlyLoadedMultiplier: Double = producerLoadMultipliersConfig.lightlyLoaded.getOrElse(1.0)

  object ScheduleTime:
    import ProducerLoadMultipliers.*

    val overloadedTopic: Long =
      ((50.0 * Math.pow(10, 6)) / (baseMultiplier * overloadedMultiplier)).toLong

    val heavilyLoadedTopic: Long =
      ((100.0 * Math.pow(10, 6)) / (baseMultiplier * heavilyLoadedMultiplier)).toLong

    val moderatelyLoadedTopic: Long =
      ((500.0 * Math.pow(10, 6)) / (baseMultiplier * moderatelyLoadedMultiplier)).toLong

    val lightlyLoadedTopic: Long =
      ((1000.0 * Math.pow(10, 6)) / (baseMultiplier * lightlyLoadedMultiplier)).toLong

  object SubscriptionAmount:
    private val subscriptionAmountConfig = config.demoAppConfig
      .flatMap(_.subscriptionAmount)
      .getOrElse(defaultConfig.demoAppConfig.get.subscriptionAmount.get)

    val overloadedTopic: Int =
      subscriptionAmountConfig.overloaded.getOrElse(faker.number().numberBetween(1, 5))
    val heavilyLoadedTopic: Int =
      subscriptionAmountConfig.heavilyLoaded.getOrElse(faker.number().numberBetween(1, 5))
    val moderatelyLoadedTopic: Int =
      subscriptionAmountConfig.moderatelyLoaded.getOrElse(faker.number().numberBetween(1, 5))
    val lightlyLoadedTopic: Int =
      subscriptionAmountConfig.lightlyLoaded.getOrElse(faker.number().numberBetween(1, 5))

  object ConsumerAmount:
    private val consumersAmountConfig = config.demoAppConfig
      .flatMap(_.consumersAmount)
      .getOrElse(defaultConfig.demoAppConfig.get.consumersAmount.get)

    val overloadedTopic: Int =
      consumersAmountConfig.overloaded.getOrElse(faker.number().numberBetween(1, 10))
    val heavilyLoadedTopic: Int =
      consumersAmountConfig.heavilyLoaded.getOrElse(faker.number().numberBetween(1, 10))
    val moderatelyLoadedTopic: Int =
      consumersAmountConfig.moderatelyLoaded.getOrElse(faker.number().numberBetween(1, 10))
    val lightlyLoadedTopic: Int =
      consumersAmountConfig.lightlyLoaded.getOrElse(faker.number().numberBetween(1, 10))

/*  object ProducerAmount:
    private val producersAmountConfig = config.loadConfig
      .flatMap(_.producersAmount)
      .getOrElse(defaultConfig.loadConfig.get.producersAmount.get)

    val overloadedTopic: Int = producersAmountConfig.overloaded.getOrElse(1)
    val heavilyLoadedTopic: Int = producersAmountConfig.heavilyLoaded.getOrElse(1)
    val moderatelyLoadedTopic: Int = producersAmountConfig.moderatelyLoaded.getOrElse(1)
    val lightlyLoadedTopic: Int = producersAmountConfig.lightlyLoaded.getOrElse(1)*/

  def logDemoAppConfig = for {
    _ <- ZIO.logInfo("Overloaded topic schedule time: " + DemoAppTopicConfig.ScheduleTime.overloadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Heavily loaded topic schedule time: " + DemoAppTopicConfig.ScheduleTime.heavilyLoadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Moderately loaded topic schedule time: " + DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Lightly loaded topic schedule time: " + DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Overloaded topic subscription amount: " + DemoAppTopicConfig.SubscriptionAmount.overloadedTopic.toString)
    _ <- ZIO.logInfo("Heavily loaded topic subscription amount: " + DemoAppTopicConfig.SubscriptionAmount.heavilyLoadedTopic.toString)
    _ <- ZIO.logInfo("Moderately loaded topic subscription amount: " + DemoAppTopicConfig.SubscriptionAmount.moderatelyLoadedTopic.toString)
    _ <- ZIO.logInfo("Lightly loaded topic subscription amount: " + DemoAppTopicConfig.SubscriptionAmount.lightlyLoadedTopic.toString)
    _ <- ZIO.logInfo("Overloaded topic consumer amount: " + DemoAppTopicConfig.ConsumerAmount.overloadedTopic.toString)
    _ <- ZIO.logInfo("Heavily loaded topic consumer amount: " + DemoAppTopicConfig.ConsumerAmount.heavilyLoadedTopic.toString)
    _ <- ZIO.logInfo("Moderately loaded topic consumer amount: " + DemoAppTopicConfig.ConsumerAmount.moderatelyLoadedTopic.toString)
    _ <- ZIO.logInfo("Lightly loaded topic consumer amount: " + DemoAppTopicConfig.ConsumerAmount.lightlyLoadedTopic.toString)
/*    _ <- ZIO.logInfo("Overloaded topic producer amount: " + DemoAppTopicConfig.ProducerAmount.overloadedTopic.toString)
    _ <- ZIO.logInfo("Heavily loaded topic producer amount: " + DemoAppTopicConfig.ProducerAmount.heavilyLoadedTopic.toString)
    _ <- ZIO.logInfo("Moderately loaded topic producer amount: " + DemoAppTopicConfig.ProducerAmount.moderatelyLoadedTopic.toString)
    _ <- ZIO.logInfo("Lightly loaded topic producer amount: " + DemoAppTopicConfig.ProducerAmount.lightlyLoadedTopic.toString)*/
  } yield ()
