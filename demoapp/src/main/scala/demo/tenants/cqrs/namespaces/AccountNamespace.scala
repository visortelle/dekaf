package demo.tenants.cqrs.namespaces

import demo.tenants.cqrs.shared.DemoappTopicConfig
import demo.tenants.cqrs.model.Account.*
import demo.tenants.cqrs.shared.mkConfigurableTopicPlanGenerator
import generators.{NamespacePlanGenerator, TenantName, TopicPlanGenerator}
import org.apache.pulsar.client.api.SubscriptionType

object AccountNamespace:
  object Commands:
    def mkPlanGenerator = (tenantName: TenantName) =>
      val namespaceName = "AccountCommands"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[CreateAccount](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CreateAccount",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddShippingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddShippingAddress",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddBillingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddBillingAddress",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DeleteAccount](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DeleteAccount",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[DeleteShippingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DeleteShippingAddress",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[DeleteBillingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DeleteBillingAddress",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[PreferShippingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PreferShippingAddress",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[PreferBillingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PreferBillingAddress",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[ActivateAccount](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ActiveAccount",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
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

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[AccountCreated](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AccountCreated",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AccountDeactivated](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AccountDeactivated",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ShippingAddressAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ShippingAddressAdded",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[BillingAddressAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "BillingAddressAdded",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AccountDeleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AccountDeleted",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[ShippingAddressDeleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ShippingAddressDeleted",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[BillingAddressDeleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "BillingAddressDeleted",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[ShippingAddressPreferred](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ShippingAddressPreferred",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[BillingAddressPreferred](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "BillingAddressPreferred",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[AccountActivated](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AccountActivated",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ShippingAddressRestored](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ShippingAddressRestored",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[BillingAddressRestored](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "BillingAddressRestored",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[PrimaryBillingAddressRemoved](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PrimaryBillingAddressRemoved",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[PrimaryShippingAddressRemoved](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PrimaryShippingAddressRemoved",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        )
      )

      NamespacePlanGenerator.make(
        mkTenant = () => tenantName,
        mkName = _ => namespaceName,
        mkTopicsCount = _ => topicPlanGenerators.size,
        mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
        mkAfterAllocation = _ => ()
      )

