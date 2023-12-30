package demo.tenants.cqrs.shared

import _root_.client.config
import _root_.config.defaultConfig
import net.datafaker.Faker
import zio.{Duration, ZIO}

val faker = new Faker()

object DemoappTopicConfig:
  sealed trait LoadType
  case object Overloaded extends LoadType
  case object HeavilyLoaded extends LoadType
  case object ModeratelyLoaded extends LoadType
  case object LightlyLoaded extends LoadType

  val enableNonPersistentTopics: Boolean = config.loadConfig.flatMap(_.enableNonPersistentTopics).getOrElse(true)
  val enablePartitionedTopics: Boolean = config.loadConfig.flatMap(_.enablePartitionedTopics).getOrElse(true)

  val workersAmount: Int = config.loadConfig.flatMap(_.workersAmount).getOrElse(faker.number().numberBetween(1, 10))

  private object ProducerLoadMultipliers:
    private val producerLoadMultipliersConfig = config.loadConfig
      .flatMap(_.producerLoadMultiplier)
      .getOrElse(defaultConfig.loadConfig.get.producerLoadMultiplier.get)

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

/*  object ProducerAmount:
    private val producersAmountConfig = config.loadConfig
      .flatMap(_.producersAmount)
      .getOrElse(defaultConfig.loadConfig.get.producersAmount.get)

    val overloadedTopic: Int = producersAmountConfig.overloaded.getOrElse(1)
    val heavilyLoadedTopic: Int = producersAmountConfig.heavilyLoaded.getOrElse(1)
    val moderatelyLoadedTopic: Int = producersAmountConfig.moderatelyLoaded.getOrElse(1)
    val lightlyLoadedTopic: Int = producersAmountConfig.lightlyLoaded.getOrElse(1)*/

  def logDemoappConfig = for {
    _ <- ZIO.logInfo("Overloaded topic schedule time: " + DemoappTopicConfig.ScheduleTime.overloadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Heavily loaded topic schedule time: " + DemoappTopicConfig.ScheduleTime.heavilyLoadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Moderately loaded topic schedule time: " + DemoappTopicConfig.ScheduleTime.moderatelyLoadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Lightly loaded topic schedule time: " + DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic / Math.pow(10, 6))
    _ <- ZIO.logInfo("Overloaded topic subscription amount: " + DemoappTopicConfig.SubscriptionAmount.overloadedTopic.toString)
    _ <- ZIO.logInfo("Heavily loaded topic subscription amount: " + DemoappTopicConfig.SubscriptionAmount.heavilyLoadedTopic.toString)
    _ <- ZIO.logInfo("Moderately loaded topic subscription amount: " + DemoappTopicConfig.SubscriptionAmount.moderatelyLoadedTopic.toString)
    _ <- ZIO.logInfo("Lightly loaded topic subscription amount: " + DemoappTopicConfig.SubscriptionAmount.lightlyLoadedTopic.toString)
    _ <- ZIO.logInfo("Overloaded topic consumer amount: " + DemoappTopicConfig.ConsumerAmount.overloadedTopic.toString)
    _ <- ZIO.logInfo("Heavily loaded topic consumer amount: " + DemoappTopicConfig.ConsumerAmount.heavilyLoadedTopic.toString)
    _ <- ZIO.logInfo("Moderately loaded topic consumer amount: " + DemoappTopicConfig.ConsumerAmount.moderatelyLoadedTopic.toString)
    _ <- ZIO.logInfo("Lightly loaded topic consumer amount: " + DemoappTopicConfig.ConsumerAmount.lightlyLoadedTopic.toString)
/*    _ <- ZIO.logInfo("Overloaded topic producer amount: " + DemoappTopicConfig.ProducerAmount.overloadedTopic.toString)
    _ <- ZIO.logInfo("Heavily loaded topic producer amount: " + DemoappTopicConfig.ProducerAmount.heavilyLoadedTopic.toString)
    _ <- ZIO.logInfo("Moderately loaded topic producer amount: " + DemoappTopicConfig.ProducerAmount.moderatelyLoadedTopic.toString)
    _ <- ZIO.logInfo("Lightly loaded topic producer amount: " + DemoappTopicConfig.ProducerAmount.lightlyLoadedTopic.toString)*/
  } yield ()
