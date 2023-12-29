package demo.tenants.cqrs.namespacesRestructured

import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap
import demo.tenants.cqrs.shared.{Command, ConverterMappings, Event, TopicConfig, mkDefaultTopicPartitioning, mkDefaultPersistency, Message as MessageDto}
import demo.tenants.cqrs.model.Account.*
import generators.*
import zio.*
import org.apache.pulsar.client.api.SubscriptionType
import zio.{Duration, Schedule, Task}

import scala.jdk.CollectionConverters.*
import java.util.UUID
import scala.annotation.tailrec
import scala.util.Random

object AccountNamespace:
  def mkPlanGenerator = (tenantName: TenantName) =>
    val namespaceName = "Account"

    val aggregatesKeys = ConcurrentLinkedHashMap.Builder[UUID, Unit]()
      .maximumWeightedCapacity(10000)
      .build()

    Unsafe.unsafe { implicit u =>
      Runtime.default.unsafe.run(
        for {
          _ <- ZIO.logInfo("--------------------")
          _ <- ZIO.logInfo("Overloaded topic schedule time: " + TopicConfig.ScheduleTime.overloadedTopic.toString)
          _ <- ZIO.logInfo("Heavily loaded topic schedule time: " + TopicConfig.ScheduleTime.heavilyLoadedTopic.toString)
          _ <- ZIO.logInfo("Moderately loaded topic schedule time: " + TopicConfig.ScheduleTime.moderatelyLoadedTopic.toString)
          _ <- ZIO.logInfo("Lightly loaded topic schedule time: " + TopicConfig.ScheduleTime.lightlyLoadedTopic.toString)
          _ <- ZIO.logInfo("--------------------")
          _ <- ZIO.logInfo("Overloaded topic subscription amount: " + TopicConfig.SubscriptionAmount.overloadedTopic.toString)
          _ <- ZIO.logInfo("Heavily loaded topic subscription amount: " + TopicConfig.SubscriptionAmount.heavilyLoadedTopic.toString)
          _ <- ZIO.logInfo("Moderately loaded topic subscription amount: " + TopicConfig.SubscriptionAmount.moderatelyLoadedTopic.toString)
          _ <- ZIO.logInfo("Lightly loaded topic subscription amount: " + TopicConfig.SubscriptionAmount.lightlyLoadedTopic.toString)
          _ <- ZIO.logInfo("--------------------")
          _ <- ZIO.logInfo("Overloaded topic consumer amount: " + TopicConfig.ConsumerAmount.overloadedTopic.toString)
          _ <- ZIO.logInfo("Heavily loaded topic consumer amount: " + TopicConfig.ConsumerAmount.heavilyLoadedTopic.toString)
          _ <- ZIO.logInfo("Moderately loaded topic consumer amount: " + TopicConfig.ConsumerAmount.moderatelyLoadedTopic.toString)
          _ <- ZIO.logInfo("Lightly loaded topic consumer amount: " + TopicConfig.ConsumerAmount.lightlyLoadedTopic.toString)
          _ <- ZIO.logInfo("--------------------")
          _ <- ZIO.logInfo("Overloaded topic producer amount: " + TopicConfig.ProducerAmount.overloadedTopic.toString)
          _ <- ZIO.logInfo("Heavily loaded topic producer amount: " + TopicConfig.ProducerAmount.heavilyLoadedTopic.toString)
          _ <- ZIO.logInfo("Moderately loaded topic producer amount: " + TopicConfig.ProducerAmount.moderatelyLoadedTopic.toString)
          _ <- ZIO.logInfo("Lightly loaded topic producer amount: " + TopicConfig.ProducerAmount.lightlyLoadedTopic.toString)
          _ <- ZIO.logInfo("--------------------")
        } yield ()
      )
    }
    def mkDependentProducerMessage[T <: MessageDto](mkValue: UUID => T): Message =
      @tailrec
      def pickRandom(iterator: Iterator[UUID], index: Int, current: Option[UUID] = None): Option[UUID] = {
        if (!iterator.hasNext) current
        else if (index == 0) Some(iterator.next())
        else {
          val nextElement = iterator.next()
          pickRandom(iterator, index - 1, Some(nextElement))
        }
      }

      aggregatesKeys.keySet() match
        case keys if keys.isEmpty => Message("", Array.emptyByteArray)
        case keys =>
          val iterator = keys.iterator().asScala
          val randomIndex = Random.nextInt(keys.size)

          pickRandom(iterator, randomIndex) match
            case None => Message("", Array.emptyByteArray)
            case Some(aggregateKey) =>
              val value = mkValue(UUID.fromString(aggregateKey.toString))
              val payload = Serde.toJsonBytes(value)
              Message(aggregateKey.toString, payload)

    // These are "main" events, meaning that they are dictating a latter event
    val producerCommandsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"CreateAccount",
        mkMessage = _ => _ =>
          val createAccount = MessageDto.random[CreateAccount]
          val key = createAccount.id.toString
          val payload = Serde.toJsonBytes(createAccount)

          aggregatesKeys.put(createAccount.id, ())

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddShippingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddBillingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[AddBillingAddress].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteAccount",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[DeleteAccount].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteShippingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[DeleteShippingAddress].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteBillingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[DeleteBillingAddress].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferShippingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[PreferShippingAddress].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferBillingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[PreferBillingAddress].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ActivateAccount",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[ActivateAccount].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
    )

    // These are "independent" events, meaning that they are not related to any command
    val producerEventsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"AccountDeactivated",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[AccountDeactivated].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressRestored",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[ShippingAddressRestored].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressRestored",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[BillingAddressRestored].copy(
              accountId = aggregateKey
            )
          ),
          mkSchedule = _ => Schedule.fixed(
            Duration.fromMillis(
              TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryBillingAddressRemoved",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[PrimaryBillingAddressRemoved].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryShippingAddressRemoved",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            MessageDto.random[PrimaryShippingAddressRemoved].copy(
              accountId = aggregateKey
            )
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
    )

    val accountCommandsTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "AccountCommands",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerCommandsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerCommandsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSubscriptionsCount = i => TopicConfig.SubscriptionAmount.moderatelyLoadedTopic,
      mkSubscriptionType = _ => SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => SubscriptionType.Shared,
        mkConsumersCount = i => TopicConfig.ConsumerAmount.lightlyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
          mkName = i => s"AccountCommandsConsumer-$i",
        )
      )
    )

    val accountEventsTopicTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "AccountEvents",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerEventsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerEventsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSubscriptionsCount = i => TopicConfig.SubscriptionAmount.heavilyLoadedTopic,
      mkSubscriptionType = _ => SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => SubscriptionType.Shared,
        mkConsumersCount = i => TopicConfig.ConsumerAmount.moderatelyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
          mkName = i => s"AccountEventsConsumer-$i",
        )
      )
    )

    val accountCommandsTopicPlan = for {
      topicPlanGenerator <- accountCommandsTopicPlanGenerator
      topicPlan <- TopicPlan.make(topicPlanGenerator, 0)
    } yield topicPlan

    val accountEventsTopicPlan = for {
      topicPlanGenerator <- accountEventsTopicTopicPlanGenerator
      topicPlan <- TopicPlan.make(topicPlanGenerator, 1)
    } yield topicPlan




    val topicPlanGenerators = List(accountCommandsTopicPlanGenerator, accountEventsTopicTopicPlanGenerator)

    val processorPlanGenerator = List(
      ProcessorPlanGenerator.make[CreateAccount, AccountCreated](
        mkName = _ => "AccountProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerCount = _ => 1,
        mkProducerName
        mkProducerPlan = _ => mkProducerPlan("AccountCreated"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("AccountCreatedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("AccountCreatedConsumer")
      )(using ConverterMappings.createAccountToAccountCreated),
      ProcessorPlanGenerator.make[AddShippingAddress, ShippingAddressAdded](
        mkName = _ => "AddShippingAddressProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("ShippingAddressAdded"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("ShippingAddressAddedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("ShippingAddressAddedConsumer")
      )(using ConverterMappings.addShippingAddressToShippingAddressAdded),
      ProcessorPlanGenerator.make[AddBillingAddress, BillingAddressAdded](
        mkName = _ => "AddBillingAddressProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("BillingAddressAdded"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("BillingAddressAddedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("BillingAddressAddedConsumer")
      )(using ConverterMappings.addBillingAddressToBillingAddressAdded),
      ProcessorPlanGenerator.make[DeleteAccount, AccountDeleted](
        mkName = _ => "DeleteAccountProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("AccountDeleted"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("AccountDeletedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("AccountDeletedConsumer")
      )(using ConverterMappings.deleteAccountToAccountDeleted),
      ProcessorPlanGenerator.make[DeleteShippingAddress, ShippingAddressDeleted](
        mkName = _ => "DeleteShippingAddressProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("ShippingAddressDeleted"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("ShippingAddressDeletedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("ShippingAddressDeletedConsumer")
      )(using ConverterMappings.deleteShippingAddressToShippingAddressDeleted),
      ProcessorPlanGenerator.make[DeleteBillingAddress, BillingAddressDeleted](
        mkName = _ => "DeleteBillingAddressProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("BillingAddressDeleted"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("BillingAddressDeletedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("BillingAddressDeletedConsumer")
      )(using ConverterMappings.deleteBillingAddressToBillingAddressDeleted),
      ProcessorPlanGenerator.make[PreferShippingAddress, ShippingAddressPreferred](
        mkName = _ => "PreferShippingAddressProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("ShippingAddressPreferred"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("ShippingAddressPreferredSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("ShippingAddressPreferredConsumer")
      )(using ConverterMappings.preferShippingAddressToShippingAddressPreferred),
      ProcessorPlanGenerator.make[PreferBillingAddress, BillingAddressPreferred](
        mkName = _ => "PreferBillingAddressProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("BillingAddressPreferred"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("BillingAddressPreferredSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("BillingAddressPreferredConsumer")
      )(using ConverterMappings.preferBillingAddressToBillingAddressPreferred),
      ProcessorPlanGenerator.make[ActivateAccount, AccountActivated](
        mkName = _ => "ActiveAccountProcessor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("AccountActivated"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("AccountActivatedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("AccountActivatedConsumer")
      )(using ConverterMappings.activeAccountToAccountActivated),
    )

    NamespacePlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => namespaceName,
      mkTopicsCount = _ => topicPlanGenerators.size,
      mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
      mkProcessorsCount = _ => processorPlanGenerator.size,
      mkProcessorGenerator = processorIndex => processorPlanGenerator(processorIndex),
      mkAfterAllocation = _ => ()
    )
