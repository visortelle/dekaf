package demo.tenants.schemas.namespaces.exampleShop.namespacesRestructured

import _root_.demo.tenants.schemas.namespaces.{TopicConfig, faker, mkDefaultPersistency, mkDefaultTopicPartitioning}
import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap
import demo.tenants.schemas.namespaces.exampleShop.commands.Account.*
import demo.tenants.schemas.namespaces.exampleShop.events.Account.*
import demo.tenants.schemas.namespaces.exampleShop.shared.{Command, ConverterMappings, Event, Message as MessageDto}
import generators.*
import org.apache.pulsar.client.api.SubscriptionType
import zio.{Duration, Schedule, Task}

import java.util.UUID

object AccountNamespace:
  def mkPlanGenerator = (tenantName: TenantName) =>
    val namespaceName = "Account"

    val aggregatesKeys = ConcurrentLinkedHashMap.Builder[UUID, Unit]()
      .maximumWeightedCapacity(10000)
      .build()

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
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val addShippingAddress = MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(addShippingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddBillingAddress",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val addBillingAddress = MessageDto.random[AddBillingAddress].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(addBillingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteAccount",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val deleteAccount = DeleteAccount(accountId = aggregateKey)
            val payload = Serde.toJsonBytes(deleteAccount)

            try aggregatesKeys.remove(aggregateKey)
            catch case _: Throwable => ()

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteShippingAddress",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val deleteShippingAddress = MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(deleteShippingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteBillingAddress",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val deleteBillingAddress = MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(deleteBillingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferShippingAddress",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val preferShippingAddress = MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(preferShippingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferBillingAddress",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val preferBillingAddress = MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(preferBillingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ActiveAccount",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val activeAccount = MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(activeAccount)

            Message(aggregateKey.toString, payload)
          end if
        ,
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
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val accountDeactivated = MessageDto.random[AccountDeactivated].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(accountDeactivated)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressRestored",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val addBillingAddress = MessageDto.random[ShippingAddressRestored].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(addBillingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressRestored",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val addBillingAddress = MessageDto.random[BillingAddressRestored].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(addBillingAddress)

            Message(aggregateKey.toString, payload)
          end if
          ,
          mkSchedule = _ => Schedule.fixed(
            Duration.fromMillis(
              TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryBillingAddressRemoved",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head

            val addBillingAddress = MessageDto.random[PrimaryBillingAddressRemoved].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(addBillingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryShippingAddressRemoved",
        mkMessage = _ => _ =>
          if aggregatesKeys.isEmpty then
            Message("", Array.emptyByteArray)
          else
            val iterator = aggregatesKeys.keySet().iterator()
            val aggregateKey = (0 until faker.number().numberBetween(1, aggregatesKeys.size()))
              .map(_ => iterator.next())
              .head
            val addBillingAddress = MessageDto.random[PrimaryShippingAddressRemoved].copy(
              accountId = aggregateKey
            )
            val payload = Serde.toJsonBytes(addBillingAddress)

            Message(aggregateKey.toString, payload)
          end if
        ,
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

    def mkProducerPlan(name: ProducerName) =
      for {
        producerPlanGenerator <- ProducerPlanGenerator.make(mkName = _ => name)
        producerPlan <- ProducerPlan.make(producerPlanGenerator, 0)
      } yield producerPlan

    def mkSubscriptionPlan(name: SubscriptionName) =
      for {
        subscriptionPlanGenerator <- SubscriptionPlanGenerator.make(mkName = _ => name)
        subscriptionPlan <- SubscriptionPlan.make(subscriptionPlanGenerator, 0)
      } yield subscriptionPlan

    def mkConsumerPlan(name: ConsumerName) =
      for {
        consumerPlanGenerator <- ConsumerPlanGenerator.make(mkName = _ => name)
        consumerPlan <- ConsumerPlan.make(consumerPlanGenerator, 0)
      } yield consumerPlan


    val topicPlanGenerators = List(accountCommandsTopicPlanGenerator, accountEventsTopicTopicPlanGenerator)

    val actorPlanGenerator = List(
      ActorPlanGenerator.make[CreateAccount, AccountCreated](
        mkName = _ => "AccountActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("AccountCreated"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("AccountCreatedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("AccountCreatedConsumer")
      )(using ConverterMappings.createAccountToAccountCreated),
      ActorPlanGenerator.make[AddShippingAddress, ShippingAddressAdded](
        mkName = _ => "AddShippingAddressActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("ShippingAddressAdded"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("ShippingAddressAddedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("ShippingAddressAddedConsumer")
      )(using ConverterMappings.addShippingAddressToShippingAddressAdded),
      ActorPlanGenerator.make[AddBillingAddress, BillingAddressAdded](
        mkName = _ => "AddBillingAddressActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("BillingAddressAdded"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("BillingAddressAddedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("BillingAddressAddedConsumer")
      )(using ConverterMappings.addBillingAddressToBillingAddressAdded),
      ActorPlanGenerator.make[DeleteAccount, AccountDeleted](
        mkName = _ => "DeleteAccountActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("AccountDeleted"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("AccountDeletedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("AccountDeletedConsumer")
      )(using ConverterMappings.deleteAccountToAccountDeleted),
      ActorPlanGenerator.make[DeleteShippingAddress, ShippingAddressDeleted](
        mkName = _ => "DeleteShippingAddressActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("ShippingAddressDeleted"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("ShippingAddressDeletedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("ShippingAddressDeletedConsumer")
      )(using ConverterMappings.deleteShippingAddressToShippingAddressDeleted),
      ActorPlanGenerator.make[DeleteBillingAddress, BillingAddressDeleted](
        mkName = _ => "DeleteBillingAddressActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("BillingAddressDeleted"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("BillingAddressDeletedSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("BillingAddressDeletedConsumer")
      )(using ConverterMappings.deleteBillingAddressToBillingAddressDeleted),
      ActorPlanGenerator.make[PreferShippingAddress, ShippingAddressPreferred](
        mkName = _ => "PreferShippingAddressActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("ShippingAddressPreferred"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("ShippingAddressPreferredSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("ShippingAddressPreferredConsumer")
      )(using ConverterMappings.preferShippingAddressToShippingAddressPreferred),
      ActorPlanGenerator.make[PreferBillingAddress, BillingAddressPreferred](
        mkName = _ => "PreferBillingAddressActor",
        mkConsumingTopicPlan = _ => accountCommandsTopicPlan,
        mkProducingTopicPlan = _ => accountEventsTopicPlan,
        mkProducerPlan = _ => mkProducerPlan("BillingAddressPreferred"),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("BillingAddressPreferredSubscription"),
        mkConsumerPlan = _ => mkConsumerPlan("BillingAddressPreferredConsumer")
      )(using ConverterMappings.preferBillingAddressToBillingAddressPreferred),
      ActorPlanGenerator.make[ActivateAccount, AccountActivated](
        mkName = _ => "ActiveAccountActor",
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
      mkActorsCount = _ => actorPlanGenerator.size,
      mkActorGenerator = actorIndex => actorPlanGenerator(actorIndex),
      mkAfterAllocation = _ => ()
    )
