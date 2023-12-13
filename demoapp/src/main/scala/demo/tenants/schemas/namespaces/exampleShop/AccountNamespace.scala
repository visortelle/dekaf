package demo.tenants.schemas.namespaces.exampleShop

import generators.{ConsumerPlanGenerator, Encoders, NamespacePlanGenerator, NonPartitioned, Partitioned, ProducerPlanGenerator, SubscriptionPlanGenerator, TenantName, TopicPlanGenerator}
import zio.{Duration, Schedule}

import java.util.UUID
import Dto.*
import org.apache.pulsar.client.impl.schema.JSONSchema
import _root_.demo.tenants.schemas.namespaces.{faker, mkRandomPartitionedOrNonPartitioned, mkRandomPersistency}
import demo.tenants.schemas.namespaces.exampleShop.commands.Account.{ActiveAccount, AddBillingAddress, AddShippingAddress, CreateAccount, DeleteAccount, DeleteBillingAddress, DeleteShippingAddress, PreferBillingAddress, PreferShippingAddress}
import demo.tenants.schemas.namespaces.exampleShop.events.Account.{AccountActivated, AccountCreated, AccountDeactivated, AccountDeleted, BillingAddressAdded, BillingAddressDeleted, BillingAddressPreferred, BillingAddressRestored, PrimaryBillingAddressRemoved, PrimaryShippingAddressRemoved, ShippingAddressAdded, ShippingAddressDeleted, ShippingAddressPreferred, ShippingAddressRestored}
import org.apache.pulsar.client.api.SubscriptionType

object AccountNamespace:
  object Commands:
    def mkPlanGenerator = (tenantName: TenantName) =>
      val namespaceName = "AccountCommands"

      val createAccountSchema = JSONSchema.of(classOf[CreateAccount])
      val addShippingAddressSchema = JSONSchema.of(classOf[AddShippingAddress])
      val addBillingAddressSchema = JSONSchema.of(classOf[AddBillingAddress])
      val deleteAccountSchema = JSONSchema.of(classOf[DeleteAccount])
      val deleteShippingAddressSchema = JSONSchema.of(classOf[DeleteShippingAddress])
      val deleteBillingAddressSchema = JSONSchema.of(classOf[DeleteBillingAddress])
      val preferShippingAddressSchema = JSONSchema.of(classOf[PreferShippingAddress])
      val preferBillingAddressSchema = JSONSchema.of(classOf[PreferBillingAddress])
      val activeAccountSchema = JSONSchema.of(classOf[ActiveAccount])

      val topicPlanGenerators = List(
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "CreateAccount",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "CreateAccountProducer",
              mkPayload = _ => _ => Encoders.toJson(CreateAccount.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
            ),
          mkSchemaInfos = _ => List(createAccountSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency,
          mkSubscriptionsCount = _ => faker.number().numberBetween(2, 10),
          mkSubscriptionType = _ => SubscriptionType.Shared,
          mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
            mkSubscriptionType = _ => SubscriptionType.Shared,
            mkConsumersCount = _ => faker.number().numberBetween(1, 5),
            mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
              mkName = i => s"CreateAccountConsumer-$i",
            )
          )
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "AddShippingAddress",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "AddShippingAddressProducer",
              mkPayload = _ => _ => Encoders.toJson(AddShippingAddress.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(100))
            ),
          mkSchemaInfos = _ => List(addShippingAddressSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "AddBillingAddress",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "AddBillingAddressProducer",
              mkPayload = _ => _ => Encoders.toJson(AddBillingAddress.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(100))
            ),
          mkSchemaInfos = _ => List(addBillingAddressSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "DeleteAccount",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "DeleteAccountProducer",
              mkPayload = _ => _ => Encoders.toJson(DeleteAccount.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(deleteAccountSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency,
          mkSubscriptionsCount = _ => faker.number().numberBetween(1, 4),
          mkSubscriptionType = _ => SubscriptionType.Failover,
          mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
            mkSubscriptionType = _ => SubscriptionType.Failover,
            mkConsumersCount = _ => faker.number().numberBetween(1, 5),
            mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
              mkName = i => s"DeleteAccountConsumer-$i",
            )
          )
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "DeleteShippingAddress",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "DeleteShippingAddressProducer",
              mkPayload = _ => _ => Encoders.toJson(DeleteShippingAddress.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(deleteShippingAddressSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "DeleteBillingAddress",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "DeleteBillingAddressProducer",
              mkPayload = _ => _ => Encoders.toJson(DeleteBillingAddress.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(deleteBillingAddressSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "PreferShippingAddress",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "PreferShippingAddressProducer",
              mkPayload = _ => _ => Encoders.toJson(PreferShippingAddress.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(preferShippingAddressSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "PreferBillingAddress",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "PreferBillingAddressProducer",
              mkPayload = _ => _ => Encoders.toJson(PreferBillingAddress.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(preferBillingAddressSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "ActiveAccount",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "ActiveAccountProducer",
              mkPayload = _ => _ => Encoders.toJson(ActiveAccount.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(50))
            ),
          mkSchemaInfos = _ => List(activeAccountSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency,
          mkSubscriptionsCount = _ => faker.number().numberBetween(2, 10),
          mkSubscriptionType = _ => SubscriptionType.Shared,
          mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
            mkSubscriptionType = _ => SubscriptionType.Shared,
            mkConsumersCount = _ => faker.number().numberBetween(1, 5),
            mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
              mkName = i => s"ActiveAccountConsumer-$i",
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

  object Events:
    def mkPlanGenerator = (tenantName: TenantName) =>
      val namespaceName = "AccountEvents"

      val accountCreatedSchema = JSONSchema.of(classOf[AccountCreated])
      val accountDeactivatedSchema = JSONSchema.of(classOf[AccountDeactivated])
      val shippingAddressAddedSchema = JSONSchema.of(classOf[ShippingAddressAdded])
      val billingAddressAddedSchema = JSONSchema.of(classOf[BillingAddressAdded])
      val accountDeletedSchema = JSONSchema.of(classOf[AccountDeleted])
      val shippingAddressDeletedSchema = JSONSchema.of(classOf[ShippingAddressDeleted])
      val billingAddressDeletedSchema = JSONSchema.of(classOf[BillingAddressDeleted])
      val shippingAddressPreferredSchema = JSONSchema.of(classOf[ShippingAddressPreferred])
      val billingAddressPreferredSchema = JSONSchema.of(classOf[BillingAddressPreferred])
      val accountActivatedSchema = JSONSchema.of(classOf[AccountActivated])
      val shippingAddressRestoredSchema = JSONSchema.of(classOf[ShippingAddressRestored])
      val billingAddressRestoredSchema = JSONSchema.of(classOf[BillingAddressRestored])
      val primaryBillingAddressRemovedSchema = JSONSchema.of(classOf[PrimaryBillingAddressRemoved])
      val primaryShippingAddressRemovedSchema = JSONSchema.of(classOf[PrimaryShippingAddressRemoved])

      val topicPlanGenerators = List(
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "AccountCreated",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "AccountCreatedProducer",
              mkPayload = _ => _ => Encoders.toJson(AccountCreated.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
            ),
          mkSchemaInfos = _ => List(accountCreatedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency,
          mkSubscriptionsCount = _ => faker.number().numberBetween(1, 20),
          mkSubscriptionType = _ => SubscriptionType.Shared,
          mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
            mkSubscriptionType = _ => SubscriptionType.Shared,
            mkConsumersCount = _ => faker.number().numberBetween(1, 20),
            mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
              mkName = i => s"AccountCreatedConsumer-$i",
            )
          )
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "AccountDeactivated",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "AccountDeactivatedProducer",
              mkPayload = _ => _ => Encoders.toJson(AccountDeactivated.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1000))
            ),
          mkSchemaInfos = _ => List(accountDeactivatedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "ShippingAddressAdded",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "ShippingAddressAddedProducer",
              mkPayload = _ => _ => Encoders.toJson(ShippingAddressAdded.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(100))
            ),
          mkSchemaInfos = _ => List(shippingAddressAddedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "BillingAddressAdded",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "BillingAddressAddedProducer",
              mkPayload = _ => _ => Encoders.toJson(BillingAddressAdded.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(100))
            ),
          mkSchemaInfos = _ => List(billingAddressAddedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "AccountDeleted",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => s"AccountDeletedProducer",
              mkPayload = _ => _ => Encoders.toJson(AccountDeleted.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(accountDeletedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency,
          mkSubscriptionsCount = _ => faker.number().numberBetween(1, 4),
          mkSubscriptionType = _ => SubscriptionType.Failover,
          mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
            mkSubscriptionType = _ => SubscriptionType.Failover,
            mkConsumersCount = _ => faker.number().numberBetween(1, 5),
            mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
              mkName = i => s"AccountDeletedConsumer-$i",
            )
          )
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "ShippingAddressDeleted",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = i => s"ShippingAddressDeletedProducer-$i",
              mkPayload = _ => _ => Encoders.toJson(ShippingAddressDeleted.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(shippingAddressDeletedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "BillingAddressDeleted",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "BillingAddressDeletedProducer",
              mkPayload = _ => _ => Encoders.toJson(BillingAddressDeleted.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(billingAddressDeletedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "ShippingAddressPreferred",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "ShippingAddressPreferredProducer",
              mkPayload = _ => _ => Encoders.toJson(ShippingAddressPreferred.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(shippingAddressPreferredSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "BillingAddressPreferred",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "BillingAddressPreferredProducer",
              mkPayload = _ => _ => Encoders.toJson(BillingAddressPreferred.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(billingAddressPreferredSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "AccountActivated",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "AccountActivatedProducer",
              mkPayload = _ => _ => Encoders.toJson(AccountActivated.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(50))
            ),
          mkSchemaInfos = _ => List(accountActivatedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency,
          mkSubscriptionsCount = _ => faker.number().numberBetween(2, 10),
          mkSubscriptionType = _ => SubscriptionType.Shared,
          mkSubscriptionGenerator = _ => SubscriptionPlanGenerator.make(
            mkSubscriptionType = _ => SubscriptionType.Shared,
            mkConsumersCount = _ => faker.number().numberBetween(1, 5),
            mkConsumerGenerator = _ => ConsumerPlanGenerator.make(
              mkName = i => s"AccountActivatedConsumer-$i",
            )
          )
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "ShippingAddressRestored",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "ShippingAddressRestoredProducer",
              mkPayload = _ => _ => Encoders.toJson(ShippingAddressRestored.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(shippingAddressRestoredSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "BillingAddressRestored",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "BillingAddressRestoredProducer",
              mkPayload = _ => _ => Encoders.toJson(BillingAddressRestored.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(billingAddressRestoredSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "PrimaryBillingAddressRemoved",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "PrimaryBillingAddressRemovedProducer",
              mkPayload = _ => _ => Encoders.toJson(PrimaryBillingAddressRemoved.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(primaryBillingAddressRemovedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => "PrimaryShippingAddressRemoved",
          mkNamespace = () => namespaceName,
          mkProducersCount = _ => 1,
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkName = _ => "PrimaryShippingAddressRemovedProducer",
              mkPayload = _ => _ => Encoders.toJson(PrimaryShippingAddressRemoved.random),
              mkSchedule = _ => Schedule.fixed(Duration.fromMillis(500))
            ),
          mkSchemaInfos = _ => List(primaryShippingAddressRemovedSchema.getSchemaInfo),
          mkPartitioning = mkRandomPartitionedOrNonPartitioned,
          mkPersistency = mkRandomPersistency
        )
      )

      NamespacePlanGenerator.make(
        mkTenant = () => tenantName,
        mkName = _ => namespaceName,
        mkTopicsCount = _ => topicPlanGenerators.size,
        mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
        mkAfterAllocation = _ => ()
      )

