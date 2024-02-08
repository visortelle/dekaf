package demo.tenants.cqrs.namespacesRestructured

import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap
import com.sun.org.slf4j.internal.Logger
import com.tools.teal.pulsar.demoapp.account.v1 as pb
import com.tools.teal.pulsar.demoapp.dto.v1 as pbDto
import demo.tenants.cqrs.model.Account.*
import demo.tenants.cqrs.shared.{DemoAppTopicConfig, mkDefaultPersistency, mkDefaultTopicPartitioning, mkMessageWithRandomKeyFromMap, mkSubscriptionPlan, mkTopicPlan}
import demo.tenants.cqrs.model
import generators.*
import org.apache.pulsar.client.api as pulsarClientApi
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchema
import zio.{Duration, Schedule, Task, *}
import app.DekafDemoApp.isAcceptingNewMessages
import client.adminClient

import java.util.UUID
import scala.jdk.FutureConverters.*

object AccountNamespace:

  val accountIdsMap = ConcurrentLinkedHashMap.Builder[UUID, Unit]()
    .maximumWeightedCapacity(10000)
    .build()

  def mkPlanGenerator = (tenantName: TenantName) =>
    val namespaceName = "Account"

    // These are "main" events, meaning that they are dictating a latter event
    val producerCommandsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"CreateAccount",
        mkMessage = _ => _ =>
          val createAccount = model.Message.random[CreateAccount]
          val key = createAccount.id.toString

          val createAccountPb = pb.CreateAccount.newBuilder()
            .setId(createAccount.id.toString)
            .setFirstName(createAccount.firstName)
            .setLastName(createAccount.lastName)
            .setEmail(createAccount.email)
            .build()

          val wrappedCreateAccountPb = pb.AccountCommandsSchema.newBuilder()
            .setCreateAccount(createAccountPb)
            .build()

          val payload = Serde.toProto[pb.AccountCommandsSchema](wrappedCreateAccountPb)

          Message(payload, Some(key))
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddShippingAddress",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val addBillingAddress = model.Message.random[AddShippingAddress].copy(
              accountId = randomAccountId
            )

            val addressPb = pbDto.Address.newBuilder()
              .setStreet(addBillingAddress.address.street)
              .setCity(addBillingAddress.address.city)
              .setState(addBillingAddress.address.state)
              .setZipCode(addBillingAddress.address.zipCode)
              .setCountry(addBillingAddress.address.country)
              .setComplement(addBillingAddress.address.complement.getOrElse(""))

            val addBillingAddressPb = pb.AddShippingAddress.newBuilder()
              .setAccountId(addBillingAddress.accountId.toString)
              .setAddress(addressPb)

            pb.AccountCommandsSchema.newBuilder()
              .setAddShippingAddress(addBillingAddressPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddBillingAddress",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val addBillingAddress = model.Message.random[AddBillingAddress].copy(
              accountId = randomAccountId
            )

            val addressPb = pbDto.Address.newBuilder()
              .setStreet(addBillingAddress.address.street)
              .setCity(addBillingAddress.address.city)
              .setState(addBillingAddress.address.state)
              .setZipCode(addBillingAddress.address.zipCode)
              .setCountry(addBillingAddress.address.country)
              .setComplement(addBillingAddress.address.complement.getOrElse(""))

            val addBillingAddressPb = pb.AddBillingAddress.newBuilder()
              .setAccountId(addBillingAddress.accountId.toString)
              .setAddress(addressPb)

            pb.AccountCommandsSchema.newBuilder()
              .setAddBillingAddress(addBillingAddressPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteAccount",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val deleteAccount = model.Message.random[DeleteAccount].copy(
              accountId = randomAccountId
            )

            val deleteAccountPb = pb.DeleteAccount.newBuilder()
              .setAccountId(deleteAccount.accountId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setDeleteAccount(deleteAccountPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteShippingAddress",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val deleteShippingAddress = model.Message.random[DeleteShippingAddress].copy(
              accountId = randomAccountId
            )

            val deleteShippingAddressPb = pb.DeleteShippingAddress.newBuilder()
              .setAccountId(deleteShippingAddress.accountId.toString)
              .setAddressId(deleteShippingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setDeleteShippingAddress(deleteShippingAddressPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteBillingAddress",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val deleteBillingAddress = model.Message.random[DeleteBillingAddress].copy(
              accountId = randomAccountId
            )

            val deleteBillingAddressPb = pb.DeleteBillingAddress.newBuilder()
              .setAccountId(deleteBillingAddress.accountId.toString)
              .setAddressId(deleteBillingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setDeleteBillingAddress(deleteBillingAddressPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferShippingAddress",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val preferShippingAddress = model.Message.random[PreferShippingAddress].copy(
              accountId = randomAccountId
            )

            val preferShippingAddressPb = pb.PreferShippingAddress.newBuilder()
              .setAccountId(preferShippingAddress.accountId.toString)
              .setAddressId(preferShippingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setPreferShippingAddress(preferShippingAddressPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferBillingAddress",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val preferBillingAddress = model.Message.random[PreferBillingAddress].copy(
              accountId = randomAccountId
            )

            val preferBillingAddressPb = pb.PreferBillingAddress.newBuilder()
              .setAccountId(preferBillingAddress.accountId.toString)
              .setAddressId(preferBillingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setPreferBillingAddress(preferBillingAddressPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ActivateAccount",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap[pb.AccountCommandsSchema](accountIdsMap, randomAccountId => {
            val activateAccount = model.Message.random[ActivateAccount].copy(
              accountId = randomAccountId
            )

            val activateAccountPb = pb.ActivateAccount.newBuilder()
              .setAccountId(activateAccount.accountId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setActivateAccount(activateAccountPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
    )

    // These are "independent" events, meaning that they are not related to any command
    val producerEventsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"AccountDeactivated",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap(accountIdsMap, randomAccountId => {
            val accountDeactivated = model.Message.random[AccountDeactivated].copy(
              accountId = randomAccountId
            )

            val accountDeactivatedPb = pb.AccountDeactivated.newBuilder()
              .setAccountId(accountDeactivated.accountId.toString)
              .setStatus(accountDeactivated.status)
              .setVersion(accountDeactivated.version)

            pb.AccountEventsSchema.newBuilder()
              .setAccountDeactivated(accountDeactivatedPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressRestored",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap(accountIdsMap, randomAccountId => {
            val shippingAddressRestored = model.Message.random[ShippingAddressRestored].copy(
              accountId = randomAccountId
            )

            val shippingAddressRestoredPb = pb.ShippingAddressRestored.newBuilder()
              .setAccountId(shippingAddressRestored.accountId.toString)
              .setAddressId(shippingAddressRestored.addressId.toString)
              .setVersion(shippingAddressRestored.version)

            pb.AccountEventsSchema.newBuilder()
              .setShippingAddressRestored(shippingAddressRestoredPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressRestored",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap(accountIdsMap, randomAccountId => {
            val billingAddressRestored = model.Message.random[BillingAddressRestored].copy(
              accountId = randomAccountId
            )

            val billingAddressRestoredPb = pb.BillingAddressRestored.newBuilder()
              .setAccountId(billingAddressRestored.accountId.toString)
              .setAddressId(billingAddressRestored.addressId.toString)
              .setVersion(billingAddressRestored.version)

            pb.AccountEventsSchema.newBuilder()
              .setBillingAddressRestored(billingAddressRestoredPb)
              .build()
          }),
          mkSchedule = _ => Schedule.fixed(
            Duration.fromNanos(
              DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryBillingAddressRemoved",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap(accountIdsMap, randomAccountId => {
            val primaryBillingAddressRemoved = model.Message.random[PrimaryBillingAddressRemoved].copy(
              accountId = randomAccountId
            )

            val primaryBillingAddressRemovedPb = pb.PrimaryBillingAddressRemoved.newBuilder()
              .setAccountId(primaryBillingAddressRemoved.accountId.toString)
              .setAddressId(primaryBillingAddressRemoved.addressId.toString)
              .setVersion(primaryBillingAddressRemoved.version)

            pb.AccountEventsSchema.newBuilder()
              .setPrimaryBillingAddressRemoved(primaryBillingAddressRemovedPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryShippingAddressRemoved",
        mkMessage = _ => _ =>
          mkMessageWithRandomKeyFromMap(accountIdsMap, randomAccountId => {
            val primaryShippingAddressRemoved = model.Message.random[PrimaryShippingAddressRemoved].copy(
              accountId = randomAccountId
            )

            val primaryShippingAddressRemovedPb = pb.PrimaryShippingAddressRemoved.newBuilder()
              .setAccountId(primaryShippingAddressRemoved.accountId.toString)
              .setAddressId(primaryShippingAddressRemoved.addressId.toString)
              .setVersion(primaryShippingAddressRemoved.version)

            pb.AccountEventsSchema.newBuilder()
              .setPrimaryShippingAddressRemoved(primaryShippingAddressRemovedPb)
              .build()
          }),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoAppTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
    )

    val accountCommandsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.AccountCommandsSchema]).getSchemaInfo
    val accountEventsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.AccountEventsSchema]).getSchemaInfo

    val accountCommandsTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "Commands",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerCommandsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerCommandsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSchemaInfos = _ => List(accountCommandsSchemaInfo),
      mkSubscriptionsCount = i => DemoAppTopicConfig.SubscriptionAmount.moderatelyLoadedTopic,
      mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
        mkConsumersCount = i => DemoAppTopicConfig.ConsumerAmount.lightlyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
      )
    )
    val accountEventsTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "Events",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerEventsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerEventsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSchemaInfos = _ => List(accountEventsSchemaInfo),
      mkSubscriptionsCount = i => DemoAppTopicConfig.SubscriptionAmount.heavilyLoadedTopic,
      mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => pulsarClientApi.SubscriptionType.Shared,
        mkConsumersCount = i => DemoAppTopicConfig.ConsumerAmount.moderatelyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
      )
    )

    val processorPlanGenerator =
      ProcessorPlanGenerator.make[pb.AccountCommandsSchema, pb.AccountEventsSchema](
        mkName = _ => "AccountProcessor",
        mkConsumingTopicPlan = _ => mkTopicPlan(accountCommandsTopicPlanGenerator, 0),
        mkProducingTopicPlan = _ => mkTopicPlan(accountEventsTopicPlanGenerator, 0),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("AccountProcessorSubscription"),
        mkWorkerCount = _ => DemoAppTopicConfig.workersAmount,
        mkWorkerConsumerName = _ => i => s"AccountProcessor-$i",
        mkWorkerProducerName = _ => i => s"AccountProcessor-$i",
        mkMessageListenerBuilder = _ => mkMessageListener
      )

    val topicPlanGenerators = List(accountCommandsTopicPlanGenerator, accountEventsTopicPlanGenerator)

    NamespacePlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => namespaceName,
      mkTopicsCount = _ => topicPlanGenerators.size,
      mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
      mkProcessorsCount = _ => 1,
      mkProcessorGenerator = processorIndex => processorPlanGenerator,
      mkAfterAllocation = _ => {
        val namespaceFqn = s"$tenantName/$namespaceName"
        adminClient.namespaces.setSchemaValidationEnforced(namespaceFqn, true)
      }
    )

  def mkMessageListener: ProcessorMessageListenerBuilder[pb.AccountCommandsSchema, pb.AccountEventsSchema] =
    (worker: ProcessorWorker[pb.AccountCommandsSchema, pb.AccountEventsSchema], producer: pulsarClientApi.Producer[pb.AccountEventsSchema]) =>
      (consumer: pulsarClientApi.Consumer[pb.AccountCommandsSchema], msg: pulsarClientApi.Message[pb.AccountCommandsSchema]) =>
        if !isAcceptingNewMessages then
          consumer.negativeAcknowledge(msg)
        else
          try
            val messageKey = msg.getKey

            val msgValue = pb.AccountCommandsSchema.parseFrom(msg.getData)

            val eventMessageValue: pb.AccountEventsSchema = msgValue.getCommandCase match
              case pb.AccountCommandsSchema.CommandCase.CREATE_ACCOUNT =>
                val createAccountPb = msgValue.getCreateAccount

                val accountCreated = model.Message.random[AccountCreated]

                val accountCreatedPb = pb.AccountCreated.newBuilder()
                  .setAccountId(createAccountPb.getId)
                  .setFirstName(createAccountPb.getFirstName)
                  .setLastName(createAccountPb.getLastName)
                  .setEmail(createAccountPb.getEmail)
                  .setStatus(accountCreated.status)
                  .setVersion(accountCreated.version)

                try accountIdsMap.put(UUID.fromString(createAccountPb.getId), ())
                catch case _: Throwable => ()

                pb.AccountEventsSchema.newBuilder()
                  .setAccountCreated(accountCreatedPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.ACTIVATE_ACCOUNT =>
                val activateAccountPb = msgValue.getActivateAccount

                val accountActivated = model.Message.random[AccountActivated]

                val accountActivatedPb = pb.AccountActivated.newBuilder()
                  .setAccountId(activateAccountPb.getAccountId)
                  .setStatus(accountActivated.status)
                  .setVersion(accountActivated.version)

                pb.AccountEventsSchema.newBuilder()
                  .setAccountActivated(accountActivatedPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.ADD_BILLING_ADDRESS =>
                val addBillingAddressPb = msgValue.getAddBillingAddress

                val billingAddressAdded = model.Message.random[BillingAddressAdded]

                val billingAddressAddedPb = pb.BillingAddressAdded.newBuilder()
                  .setAccountId(addBillingAddressPb.getAccountId)
                  .setAddressId(billingAddressAdded.addressId.toString)
                  .setAddress(addBillingAddressPb.getAddress)
                  .setVersion(billingAddressAdded.version)

                pb.AccountEventsSchema.newBuilder()
                  .setBillingAddressAdded(billingAddressAddedPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.ADD_SHIPPING_ADDRESS =>
                val addShippingAddressPb = msgValue.getAddShippingAddress

                val shippingAddressAdded = model.Message.random[ShippingAddressAdded]

                val shippingAddressAddedPb = pb.ShippingAddressAdded.newBuilder()
                  .setAccountId(addShippingAddressPb.getAccountId)
                  .setAddressId(shippingAddressAdded.addressId.toString)
                  .setAddress(addShippingAddressPb.getAddress)
                  .setVersion(shippingAddressAdded.version)

                pb.AccountEventsSchema.newBuilder()
                  .setShippingAddressAdded(shippingAddressAddedPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.DELETE_ACCOUNT =>
                val deleteAccountPb = msgValue.getDeleteAccount

                val accountDeleted = model.Message.random[AccountDeleted]

                val accountDeletedPb = pb.AccountDeleted.newBuilder()
                  .setAccountId(deleteAccountPb.getAccountId)
                  .setStatus(accountDeleted.status)
                  .setVersion(accountDeleted.version)

                try accountIdsMap.remove(UUID.fromString(deleteAccountPb.getAccountId))
                catch case _: Throwable => ()

                pb.AccountEventsSchema.newBuilder()
                  .setAccountDeleted(accountDeletedPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.DELETE_BILLING_ADDRESS =>
                val deleteBillingAddressPb = msgValue.getDeleteBillingAddress

                val billingAddressDeleted = model.Message.random[BillingAddressDeleted]

                val billingAddressDeletedPb = pb.BillingAddressDeleted.newBuilder()
                  .setAccountId(deleteBillingAddressPb.getAccountId)
                  .setAddressId(deleteBillingAddressPb.getAddressId)
                  .setVersion(billingAddressDeleted.version)

                pb.AccountEventsSchema.newBuilder()
                  .setBillingAddressDeleted(billingAddressDeletedPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.DELETE_SHIPPING_ADDRESS =>
                val deleteShippingAddressPb = msgValue.getDeleteShippingAddress

                val shippingAddressDeleted = model.Message.random[ShippingAddressDeleted]

                val shippingAddressDeletedPb = pb.ShippingAddressDeleted.newBuilder()
                  .setAccountId(deleteShippingAddressPb.getAccountId)
                  .setAddressId(deleteShippingAddressPb.getAddressId)
                  .setVersion(shippingAddressDeleted.version)

                pb.AccountEventsSchema.newBuilder()
                  .setShippingAddressDeleted(shippingAddressDeletedPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.PREFER_SHIPPING_ADDRESS =>
                val preferShippingAddressPb = msgValue.getPreferShippingAddress

                val shippingAddressPreferred = model.Message.random[ShippingAddressPreferred]

                val shippingAddressPreferredPb = pb.ShippingAddressPreferred.newBuilder()
                  .setAccountId(preferShippingAddressPb.getAccountId)
                  .setAddressId(preferShippingAddressPb.getAddressId)
                  .setVersion(shippingAddressPreferred.version)

                pb.AccountEventsSchema.newBuilder()
                  .setShippingAddressPreferred(shippingAddressPreferredPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.PREFER_BILLING_ADDRESS =>
                val preferBillingAddressPb = msgValue.getPreferBillingAddress

                val billingAddressPreferred = model.Message.random[BillingAddressPreferred]

                val billingAddressPreferredPb = pb.BillingAddressPreferred.newBuilder()
                  .setAccountId(preferBillingAddressPb.getAccountId)
                  .setAddressId(preferBillingAddressPb.getAddressId)
                  .setVersion(billingAddressPreferred.version)

                pb.AccountEventsSchema.newBuilder()
                  .setBillingAddressPreferred(billingAddressPreferredPb)
                  .build()
              case pb.AccountCommandsSchema.CommandCase.COMMAND_NOT_SET => throw RuntimeException("Command not set")

            val effect = for {
              _ <- worker.producerPlan.messageIndex.update(_ + 1)
              _ <- ZIO.fromFuture(e =>
                producer.asInstanceOf[pulsarClientApi.Producer[Array[Byte]]].newMessage
                  .key(messageKey)
                  .value(eventMessageValue.toByteArray)
                  .sendAsync
                  .asScala
              )
            } yield ()

            Unsafe.unsafe { implicit u =>
              Runtime.default.unsafe.run(effect)
            }

            consumer.acknowledge(msg)
          catch
            case e: Throwable =>
              consumer.acknowledge(msg)
