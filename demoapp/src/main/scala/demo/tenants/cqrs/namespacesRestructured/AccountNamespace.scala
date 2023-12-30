package demo.tenants.cqrs.namespacesRestructured

import com.google.protobuf.GeneratedMessageV3
import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap
import com.tools.teal.demoapp.account.v1 as pb
import com.tools.teal.demoapp.dto.v1 as pbDto
import demo.tenants.cqrs.model.Account.*
import demo.tenants.cqrs.shared.{DemoappTopicConfig, mkDefaultPersistency, mkDefaultTopicPartitioning, Message as MessageDto}
import generators.*
import org.apache.pulsar.client.api.{Consumer, Producer, SubscriptionType, Message as PulsarMessage}
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchema
import zio.{Duration, Schedule, Task, *}

import java.util.UUID
import scala.annotation.tailrec
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import scala.util.Random

object AccountNamespace:
  def mkPlanGenerator = (tenantName: TenantName) =>
    val namespaceName = "Account"

    val aggregatesKeys = ConcurrentLinkedHashMap.Builder[UUID, Unit]()
      .maximumWeightedCapacity(10000)
      .build()

    def mkDependentProducerMessage[T <: GeneratedMessageV3](mkValue: UUID => T): Message =
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
        case keys if keys.isEmpty => Message(Array.emptyByteArray, Some(""))
        case keys =>
          val iterator = keys.iterator().asScala
          val randomIndex = Random.nextInt(keys.size)

          pickRandom(iterator, randomIndex) match
            case None => Message(Array.emptyByteArray, Some(""))
            case Some(aggregateKey) =>
              val value = mkValue(UUID.fromString(aggregateKey.toString))
              val payload = Serde.toProto(value)
              Message(payload, Some(aggregateKey.toString))

    // These are "main" events, meaning that they are dictating a latter event
    val producerCommandsPlanGenerators = List(
      ProducerPlanGenerator.make(
        mkName = i => s"CreateAccount",
        mkMessage = _ => _ =>
          val createAccount = MessageDto.random[CreateAccount]
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

          aggregatesKeys.put(createAccount.id, ())

          Message(payload, Some(key))
        ,
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.overloadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddShippingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val addBillingAddress = MessageDto.random[AddShippingAddress].copy(
              accountId = aggregateKey
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
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"AddBillingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val addBillingAddress = MessageDto.random[AddBillingAddress].copy(
              accountId = aggregateKey
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
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.heavilyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteAccount",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val deleteAccount = MessageDto.random[DeleteAccount].copy(
              accountId = aggregateKey
            )

            val deleteAccountPb = pb.DeleteAccount.newBuilder()
              .setAccountId(deleteAccount.accountId.toString)

            try aggregatesKeys.remove(aggregateKey)
            catch case _: Throwable => ()

            pb.AccountCommandsSchema.newBuilder()
              .setDeleteAccount(deleteAccountPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteShippingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val deleteShippingAddress = MessageDto.random[DeleteShippingAddress].copy(
              accountId = aggregateKey
            )

            val deleteShippingAddressPb = pb.DeleteShippingAddress.newBuilder()
              .setAccountId(deleteShippingAddress.accountId.toString)
              .setAddressId(deleteShippingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setDeleteShippingAddress(deleteShippingAddressPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"DeleteBillingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val deleteBillingAddress = MessageDto.random[DeleteBillingAddress].copy(
              accountId = aggregateKey
            )

            val deleteBillingAddressPb = pb.DeleteBillingAddress.newBuilder()
              .setAccountId(deleteBillingAddress.accountId.toString)
              .setAddressId(deleteBillingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setDeleteBillingAddress(deleteBillingAddressPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferShippingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val preferShippingAddress = MessageDto.random[PreferShippingAddress].copy(
              accountId = aggregateKey
            )

            val preferShippingAddressPb = pb.PreferShippingAddress.newBuilder()
              .setAccountId(preferShippingAddress.accountId.toString)
              .setAddressId(preferShippingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setPreferShippingAddress(preferShippingAddressPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PreferBillingAddress",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val preferBillingAddress = MessageDto.random[PreferBillingAddress].copy(
              accountId = aggregateKey
            )

            val preferBillingAddressPb = pb.PreferBillingAddress.newBuilder()
              .setAccountId(preferBillingAddress.accountId.toString)
              .setAddressId(preferBillingAddress.addressId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setPreferBillingAddress(preferBillingAddressPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ActivateAccount",
        mkMessage = _ => _ =>
          mkDependentProducerMessage[pb.AccountCommandsSchema](aggregateKey =>
            val activateAccount = MessageDto.random[ActivateAccount].copy(
              accountId = aggregateKey
            )

            val activateAccountPb = pb.ActivateAccount.newBuilder()
              .setAccountId(activateAccount.accountId.toString)

            pb.AccountCommandsSchema.newBuilder()
              .setActivateAccount(activateAccountPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.overloadedTopic
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
            val accountDeactivated = MessageDto.random[AccountDeactivated].copy(
              accountId = aggregateKey
            )

            val accountDeactivatedPb = pb.AccountDeactivated.newBuilder()
              .setAccountId(accountDeactivated.accountId.toString)
              .setStatus(accountDeactivated.status)
              .setVersion(accountDeactivated.version)

            pb.AccountEventsSchema.newBuilder()
              .setAccountDeactivated(accountDeactivatedPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"ShippingAddressRestored",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            val shippingAddressRestored = MessageDto.random[ShippingAddressRestored].copy(
              accountId = aggregateKey
            )

            val shippingAddressRestoredPb = pb.ShippingAddressRestored.newBuilder()
              .setAccountId(shippingAddressRestored.accountId.toString)
              .setAddressId(shippingAddressRestored.addressId.toString)
              .setVersion(shippingAddressRestored.version)

            pb.AccountEventsSchema.newBuilder()
              .setShippingAddressRestored(shippingAddressRestoredPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.moderatelyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"BillingAddressRestored",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            val billingAddressRestored = MessageDto.random[BillingAddressRestored].copy(
              accountId = aggregateKey
            )

            val billingAddressRestoredPb = pb.BillingAddressRestored.newBuilder()
              .setAccountId(billingAddressRestored.accountId.toString)
              .setAddressId(billingAddressRestored.addressId.toString)
              .setVersion(billingAddressRestored.version)

            pb.AccountEventsSchema.newBuilder()
              .setBillingAddressRestored(billingAddressRestoredPb)
              .build()
          ),
          mkSchedule = _ => Schedule.fixed(
            Duration.fromNanos(
              DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryBillingAddressRemoved",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            val primaryBillingAddressRemoved = MessageDto.random[PrimaryBillingAddressRemoved].copy(
              accountId = aggregateKey
            )

            val primaryBillingAddressRemovedPb = pb.PrimaryBillingAddressRemoved.newBuilder()
              .setAccountId(primaryBillingAddressRemoved.accountId.toString)
              .setAddressId(primaryBillingAddressRemoved.addressId.toString)
              .setVersion(primaryBillingAddressRemoved.version)

            pb.AccountEventsSchema.newBuilder()
              .setPrimaryBillingAddressRemoved(primaryBillingAddressRemovedPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
      ProducerPlanGenerator.make(
        mkName = i => s"PrimaryShippingAddressRemoved",
        mkMessage = _ => _ =>
          mkDependentProducerMessage(aggregateKey =>
            val primaryShippingAddressRemoved = MessageDto.random[PrimaryShippingAddressRemoved].copy(
              accountId = aggregateKey
            )

            val primaryShippingAddressRemovedPb = pb.PrimaryShippingAddressRemoved.newBuilder()
              .setAccountId(primaryShippingAddressRemoved.accountId.toString)
              .setAddressId(primaryShippingAddressRemoved.addressId.toString)
              .setVersion(primaryShippingAddressRemoved.version)

            pb.AccountEventsSchema.newBuilder()
              .setPrimaryShippingAddressRemoved(primaryShippingAddressRemovedPb)
              .build()
          ),
        mkSchedule = _ => Schedule.fixed(
          Duration.fromNanos(
            DemoappTopicConfig.ScheduleTime.lightlyLoadedTopic
          )
        )
      ),
    )

    val accountCommandsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.AccountCommandsSchema]).getSchemaInfo
    val accountEventsSchemaInfo = ProtobufNativeSchema.of(classOf[pb.AccountEventsSchema]).getSchemaInfo

    val accountCommandsTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "AccountCommands",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerCommandsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerCommandsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSchemaInfos = _ => List(accountCommandsSchemaInfo),
      mkSubscriptionsCount = i => DemoappTopicConfig.SubscriptionAmount.moderatelyLoadedTopic,
      mkSubscriptionType = _ => SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => SubscriptionType.Shared,
        mkConsumersCount = i => DemoappTopicConfig.ConsumerAmount.lightlyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
      )
    )
    val accountEventsTopicPlanGenerator = TopicPlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => "AccountEvents",
      mkNamespace = () => namespaceName,
      mkProducersCount = i => producerEventsPlanGenerators.size,
      mkProducerGenerator = producerIndex => producerEventsPlanGenerators(producerIndex),
      mkPartitioning = mkDefaultTopicPartitioning,
      mkPersistency = mkDefaultPersistency,
      mkSchemaInfos = _ => List(accountEventsSchemaInfo),
      mkSubscriptionsCount = i => DemoappTopicConfig.SubscriptionAmount.heavilyLoadedTopic,
      mkSubscriptionType = _ => SubscriptionType.Shared,
      mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
        mkSubscriptionType = _ => SubscriptionType.Shared,
        mkConsumersCount = i => DemoappTopicConfig.ConsumerAmount.moderatelyLoadedTopic,
        mkConsumerGenerator = _ => ConsumerPlanGenerator.make()
      )
    )

    val processorPlanGenerator = List(
      ProcessorPlanGenerator.make[pb.AccountCommandsSchema, pb.AccountEventsSchema](
        mkName = _ => "AccountProcessor",
        mkConsumingTopicPlan = _ => mkTopicPlan(accountCommandsTopicPlanGenerator, 0),
        mkProducingTopicPlan = _ => mkTopicPlan(accountEventsTopicPlanGenerator, 0),
        mkSubscriptionPlan = _ => mkSubscriptionPlan("AccountCreatedSubscription"),
        mkWorkerCount = _ => DemoappTopicConfig.workersAmount,
        mkWorkerConsumerName = _ => i => s"AccountProcessor-$i",
        mkWorkerProducerName = _ => i => s"AccountProcessor-$i",
        mkMessageListenerBuilder = _ => mkMessageListener
      ),
    )

    val topicPlanGenerators = List(accountCommandsTopicPlanGenerator, accountEventsTopicPlanGenerator)

    NamespacePlanGenerator.make(
      mkTenant = () => tenantName,
      mkName = _ => namespaceName,
      mkTopicsCount = _ => topicPlanGenerators.size,
      mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
      mkProcessorsCount = _ => processorPlanGenerator.size,
      mkProcessorGenerator = processorIndex => processorPlanGenerator(processorIndex),
      mkAfterAllocation = _ => ()
    )

  def mkSubscriptionPlan(name: SubscriptionName) = for {
    subscriptionPlanGenerator <- SubscriptionPlanGenerator.make(
      mkName = _ => name,
      mkSubscriptionType = _ => SubscriptionType.Shared
    )
    subscriptionPlan <- SubscriptionPlan.make(subscriptionPlanGenerator, 0)
  } yield subscriptionPlan

  def mkTopicPlan(topicPlanGenerator: Task[TopicPlanGenerator], topicIndex: TopicIndex) = for {
    topicPlanGenerator <- topicPlanGenerator
    topicPlan <- TopicPlan.make(topicPlanGenerator, topicIndex)
  } yield topicPlan

  def mkMessageListener: ProcessorMessageListenerBuilder[pb.AccountCommandsSchema, pb.AccountEventsSchema] =
    (worker: ProcessorWorker[pb.AccountCommandsSchema, pb.AccountEventsSchema], producer: Producer[pb.AccountEventsSchema]) =>
      (consumer: Consumer[pb.AccountCommandsSchema], msg: PulsarMessage[pb.AccountCommandsSchema]) =>
        try
          val messageKey = msg.getKey

          val eventMessageValue: pb.AccountEventsSchema = msg.getValue.getEventCase match
            case pb.AccountCommandsSchema.EventCase.CREATE_ACCOUNT =>
              val createAccountPb = msg.getValue.getCreateAccount

              val accountCreated = MessageDto.random[AccountCreated]

              val accountCreatedPb = pb.AccountCreated.newBuilder()
                .setAccountId(createAccountPb.getId)
                .setFirstName(createAccountPb.getFirstName)
                .setLastName(createAccountPb.getLastName)
                .setEmail(createAccountPb.getEmail)
                .setStatus(accountCreated.status)
                .setVersion(accountCreated.version)

              pb.AccountEventsSchema.newBuilder()
                .setAccountCreated(accountCreatedPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.ACTIVATE_ACCOUNT =>
              val activateAccountPb = msg.getValue.getActivateAccount

              val accountActivated = MessageDto.random[AccountActivated]

              val accountActivatedPb = pb.AccountActivated.newBuilder()
                .setAccountId(activateAccountPb.getAccountId)
                .setStatus(accountActivated.status)
                .setVersion(accountActivated.version)

              pb.AccountEventsSchema.newBuilder()
                .setAccountActivated(accountActivatedPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.ADD_BILLING_ADDRESS =>
              val addBillingAddressPb = msg.getValue.getAddBillingAddress

              val billingAddressAdded = MessageDto.random[BillingAddressAdded]

              val billingAddressAddedPb = pb.BillingAddressAdded.newBuilder()
                .setAccountId(addBillingAddressPb.getAccountId)
                .setAddressId(billingAddressAdded.addressId.toString)
                .setAddress(addBillingAddressPb.getAddress)
                .setVersion(billingAddressAdded.version)

              pb.AccountEventsSchema.newBuilder()
                .setBillingAddressAdded(billingAddressAddedPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.ADD_SHIPPING_ADDRESS =>
              val addShippingAddressPb = msg.getValue.getAddShippingAddress

              val shippingAddressAdded = MessageDto.random[ShippingAddressAdded]

              val shippingAddressAddedPb = pb.ShippingAddressAdded.newBuilder()
                .setAccountId(addShippingAddressPb.getAccountId)
                .setAddressId(shippingAddressAdded.addressId.toString)
                .setAddress(addShippingAddressPb.getAddress)
                .setVersion(shippingAddressAdded.version)

              pb.AccountEventsSchema.newBuilder()
                .setShippingAddressAdded(shippingAddressAddedPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.DELETE_ACCOUNT =>
              val deleteAccountPb = msg.getValue.getDeleteAccount

              val accountDeleted = MessageDto.random[AccountDeleted]

              val accountDeletedPb = pb.AccountDeleted.newBuilder()
                .setAccountId(deleteAccountPb.getAccountId)
                .setStatus(accountDeleted.status)
                .setVersion(accountDeleted.version)

              pb.AccountEventsSchema.newBuilder()
                .setAccountDeleted(accountDeletedPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.DELETE_BILLING_ADDRESS =>
              val deleteBillingAddressPb = msg.getValue.getDeleteBillingAddress

              val billingAddressDeleted = MessageDto.random[BillingAddressDeleted]

              val billingAddressDeletedPb = pb.BillingAddressDeleted.newBuilder()
                .setAccountId(deleteBillingAddressPb.getAccountId)
                .setAddressId(deleteBillingAddressPb.getAddressId)
                .setVersion(billingAddressDeleted.version)

              pb.AccountEventsSchema.newBuilder()
                .setBillingAddressDeleted(billingAddressDeletedPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.DELETE_SHIPPING_ADDRESS =>
              val deleteShippingAddressPb = msg.getValue.getDeleteShippingAddress

              val shippingAddressDeleted = MessageDto.random[ShippingAddressDeleted]

              val shippingAddressDeletedPb = pb.ShippingAddressDeleted.newBuilder()
                .setAccountId(deleteShippingAddressPb.getAccountId)
                .setAddressId(deleteShippingAddressPb.getAddressId)
                .setVersion(shippingAddressDeleted.version)

              pb.AccountEventsSchema.newBuilder()
                .setShippingAddressDeleted(shippingAddressDeletedPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.PREFER_SHIPPING_ADDRESS =>
              val preferShippingAddressPb = msg.getValue.getPreferShippingAddress

              val shippingAddressPreferred = MessageDto.random[ShippingAddressPreferred]

              val shippingAddressPreferredPb = pb.ShippingAddressPreferred.newBuilder()
                .setAccountId(preferShippingAddressPb.getAccountId)
                .setAddressId(preferShippingAddressPb.getAddressId)
                .setVersion(shippingAddressPreferred.version)

              pb.AccountEventsSchema.newBuilder()
                .setShippingAddressPreferred(shippingAddressPreferredPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.PREFER_BILLING_ADDRESS =>
              val preferBillingAddressPb = msg.getValue.getPreferBillingAddress

              val billingAddressPreferred = MessageDto.random[BillingAddressPreferred]

              val billingAddressPreferredPb = pb.BillingAddressPreferred.newBuilder()
                .setAccountId(preferBillingAddressPb.getAccountId)
                .setAddressId(preferBillingAddressPb.getAddressId)
                .setVersion(billingAddressPreferred.version)

              pb.AccountEventsSchema.newBuilder()
                .setBillingAddressPreferred(billingAddressPreferredPb)
                .build()
            case pb.AccountCommandsSchema.EventCase.EVENT_NOT_SET => throw RuntimeException("Event not set")

          val effect = for {
            _ <- worker.producerPlan.messageIndex.update(_ + 1)
            _ <- ZIO.fromFuture(e =>
              producer.newMessage
                .key(messageKey)
                .value(eventMessageValue)
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
