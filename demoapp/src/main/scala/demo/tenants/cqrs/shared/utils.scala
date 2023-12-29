package demo.tenants.cqrs.shared

import _root_.generators.*
import demo.tenants.cqrs.model.Account.*
import demo.tenants.cqrs.shared.Message as MessageDto
import _root_.demo.tenants.cqrs.shared.{faker, mkDefaultPersistency, mkDefaultTopicPartitioning}
import demo.tenants.cqrs.shared.TopicConfig
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.schema.SchemaInfo
import zio.{Duration, Schedule}

import java.util.UUID

def mkConfigurableTopicPlanGenerator[T <: MessageDto](
  mkTenant: () => TenantName = () => "dekaf_default",
  mkNamespace: () => NamespaceName = () => "dekaf_default",
  mkName: TopicIndex => TopicName = i => s"topic-$i",
  mkLoadType: TopicIndex => TopicConfig.LoadType,
  mkSubscriptionType: SubscriptionIndex => SubscriptionType,
)(using rn: Randomizable[T], sch: Schemable[T]) =
  val schemaInfo = MessageDto.schema[T].getSchemaInfo

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
        mkMessage = _ => _ => Message(Serde.toJsonBytes(MessageDto.random[T])),
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

object ConverterMappings:
  given commandToEvent: Convertible[Command, Event] with {
    def convert(a: Command): Event = a match
      case c: CreateAccount => createAccountToAccountCreated.convert(c)
      case c: AddShippingAddress => addShippingAddressToShippingAddressAdded.convert(c)
  }

  given createAccountToAccountCreated: Convertible[CreateAccount, AccountCreated] with {
    def convert(a: CreateAccount): AccountCreated = {
      AccountCreated(
        accountId = a.id,
        firstName = a.firstName,
        lastName = a.lastName,
        email = a.email,
        status = faker.lorem().word(),
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given addShippingAddressToShippingAddressAdded: Convertible[AddShippingAddress, ShippingAddressAdded] with {
    def convert(a: AddShippingAddress): ShippingAddressAdded = {
      ShippingAddressAdded(
        accountId = a.accountId,
        addressId = UUID.randomUUID(),
        address = a.address,
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given addBillingAddressToBillingAddressAdded: Convertible[AddBillingAddress, BillingAddressAdded] with {
    def convert(a: AddBillingAddress): BillingAddressAdded = {
      BillingAddressAdded(
        accountId = a.accountId,
        addressId = UUID.randomUUID(),
        address = a.address,
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given deleteAccountToAccountDeleted: Convertible[DeleteAccount, AccountDeleted] with {
    def convert(a: DeleteAccount): AccountDeleted = {
      AccountDeleted(
        accountId = a.accountId,
        status = "Deleted",
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given deleteShippingAddressToShippingAddressDeleted: Convertible[DeleteShippingAddress, ShippingAddressDeleted] with {
    def convert(a: DeleteShippingAddress): ShippingAddressDeleted = {
      ShippingAddressDeleted(
        accountId = a.accountId,
        addressId = a.addressId,
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given deleteBillingAddressToBillingAddressDeleted: Convertible[DeleteBillingAddress, BillingAddressDeleted] with {
    def convert(a: DeleteBillingAddress): BillingAddressDeleted = {
      BillingAddressDeleted(
        accountId = a.accountId,
        addressId = a.addressId,
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given preferShippingAddressToShippingAddressPreferred: Convertible[PreferShippingAddress, ShippingAddressPreferred] with {
    def convert(a: PreferShippingAddress): ShippingAddressPreferred = {
      ShippingAddressPreferred(
        accountId = a.accountId,
        addressId = a.addressId,
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given preferBillingAddressToBillingAddressPreferred: Convertible[PreferBillingAddress, BillingAddressPreferred] with {
    def convert(a: PreferBillingAddress): BillingAddressPreferred = {
      BillingAddressPreferred(
        accountId = a.accountId,
        addressId = a.addressId,
        version = faker.number().numberBetween(1, 100)
      )
    }
  }

  given activeAccountToAccountActivated: Convertible[ActivateAccount, AccountActivated] with {
    def convert(a: ActivateAccount): AccountActivated = {
      AccountActivated(
        accountId = a.accountId,
        status = faker.lorem().word(),
        version = faker.number().numberBetween(1, 100)
      )
    }
  }
