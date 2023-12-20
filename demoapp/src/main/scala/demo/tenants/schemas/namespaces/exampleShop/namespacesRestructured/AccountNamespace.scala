package demo.tenants.schemas.namespaces.exampleShop.namespacesRestructured

import _root_.demo.tenants.schemas.namespaces.{TopicConfig, mkDefaultPersistency, mkDefaultTopicPartitioning}
import demo.tenants.schemas.namespaces.exampleShop.commands.Account.*
import demo.tenants.schemas.namespaces.exampleShop.events.Account.*
import demo.tenants.schemas.namespaces.exampleShop.shared.Message as MessageDto
import generators.*
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.client.impl.schema.JSONSchema
import zio.{Duration, Schedule}

object AccountNamespace:
  def mkPlanGenerator = (tenantName: TenantName) =>
    val namespaceName = "Account"

    val producerCommandsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"CreateAccount",
        mkMessage = _ => _ =>
          val createAccount = MessageDto.random[CreateAccount]
          val key = createAccount.id.toString
          val payload = Encoders.toJson(createAccount)

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
          val addShippingAddress = MessageDto.random[AddShippingAddress]
          val key = addShippingAddress.accountId.toString
          val payload = Encoders.toJson(addShippingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddBillingAddress",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[AddBillingAddress]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteAccount",
        mkMessage = _ => _ =>
          val deleteAccount = MessageDto.random[DeleteAccount]
          val key = deleteAccount.accountId.toString
          val payload = Encoders.toJson(deleteAccount)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteShippingAddress",
        mkMessage = _ => _ =>
          val deleteShippingAddress = MessageDto.random[AddShippingAddress]
          val key = deleteShippingAddress.accountId.toString
          val payload = Encoders.toJson(deleteShippingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteBillingAddress",
        mkMessage = _ => _ =>
          val deleteBillingAddress = MessageDto.random[AddShippingAddress]
          val key = deleteBillingAddress.accountId.toString
          val payload = Encoders.toJson(deleteBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferShippingAddress",
        mkMessage = _ => _ =>
          val preferShippingAddress = MessageDto.random[AddShippingAddress]
          val key = preferShippingAddress.accountId.toString
          val payload = Encoders.toJson(preferShippingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferBillingAddress",
        mkMessage = _ => _ =>
          val preferBillingAddress = MessageDto.random[AddShippingAddress]
          val key = preferBillingAddress.accountId.toString
          val payload = Encoders.toJson(preferBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ActiveAccount",
        mkMessage = _ => _ =>
          val activeAccount = MessageDto.random[AddShippingAddress]
          val key = activeAccount.accountId.toString
          val payload = Encoders.toJson(activeAccount)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
    )

    val producerEventsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"AccountCreated",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[AccountCreated]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AccountDeactivated",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[AccountDeactivated]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressAdded",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[ShippingAddressAdded]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressAdded",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[BillingAddressAdded]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AccountDeleted",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[AccountDeleted]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressDeleted",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[ShippingAddressDeleted]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressDeleted",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[BillingAddressDeleted]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressPreferred",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[ShippingAddressPreferred]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressPreferred",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[BillingAddressPreferred]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AccountActivated",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[AccountActivated]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressRestored",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[ShippingAddressRestored]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressRestored",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[BillingAddressRestored]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryBillingAddressRemoved",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[PrimaryBillingAddressRemoved]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryShippingAddressRemoved",
        mkMessage = _ => _ =>
          val addBillingAddress = MessageDto.random[PrimaryShippingAddressRemoved]
          val key = addBillingAddress.accountId.toString
          val payload = Encoders.toJson(addBillingAddress)

          Message(key, payload)
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromMillis(
            TopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
    )

    val topicPlanGenerators = List(
      TopicPlanGenerator.make(
        mkTenant = () => tenantName,
        mkName = _ => "AccountCommands",
        mkNamespace = () => namespaceName,
        mkProducersCount = i => producerCommandsPlanGenerators.size,
        mkProducerGenerator = producerIndex => producerCommandsPlanGenerators(producerIndex),
        mkPartitioning = mkDefaultTopicPartitioning,
        mkPersistency = mkDefaultPersistency,
        mkSubscriptionsCount = _ => TopicConfig.SubscriptionAmount.heavilyLoadedTopic,
        mkSubscriptionType = _ => SubscriptionType.Key_Shared,
        mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
          mkSubscriptionType = _ => SubscriptionType.Key_Shared,
          mkConsumersCount = _ => TopicConfig.ConsumerAmount.heavilyLoadedTopic,
          mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
            mkName = i => s"consumer-$i",
          )
        )
      ),
      TopicPlanGenerator.make(
        mkTenant = () => tenantName,
        mkName = _ => "AccountEvents",
        mkNamespace = () => namespaceName,
        mkProducersCount = i => producerEventsPlanGenerators.size,
        mkProducerGenerator = producerIndex => producerEventsPlanGenerators(producerIndex),
        mkPartitioning = mkDefaultTopicPartitioning,
        mkPersistency = mkDefaultPersistency,
        mkSubscriptionsCount = _ => TopicConfig.SubscriptionAmount.heavilyLoadedTopic,
        mkSubscriptionType = _ => SubscriptionType.Key_Shared,
        mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
          mkSubscriptionType = _ => SubscriptionType.Key_Shared,
          mkConsumersCount = _ => TopicConfig.ConsumerAmount.heavilyLoadedTopic,
          mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
            mkName = i => s"consumer-$i",
          )
        )
      )
    )

    NamespacePlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => namespaceName,
      mkTopicsCount = _ => topicPlanGenerators.size,
      mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
      mkAfterAllocation = _ => ()
    )
