package demo.tenants.cqrs.namespaces

import demo.tenants.cqrs.shared.DemoAppTopicConfig
import demo.tenants.cqrs.model.ShoppingCart.*
import demo.tenants.cqrs.shared.mkConfigurableTopicPlanGenerator
import generators.{NamespacePlanGenerator, TenantName}
import org.apache.pulsar.client.api.SubscriptionType

object ShoppingCartNamespace:
  object Commands:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "ShoppingCartCommands"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[AddCartItem](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddCartItem",
          mkLoadType = _ => DemoAppTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddCreditCard](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddCreditCard",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddDebitCard](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddDebitCard",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddPayPal](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddPayPal",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddShippingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddShippingAddress",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddBillingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddBillingAddress",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CreateCart](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CreateCart",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CheckOutCart](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CheckOutCart",
          mkLoadType = _ => DemoAppTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RemoveCartItem](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RemoveCartItem",
          mkLoadType = _ => DemoAppTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ChangeCartItemQuantity](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ChangeCartItemQuantity",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DiscardCart](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DiscardCart",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RemovePaymentMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RemovePaymentMethod",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RebuildCartProjection](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RebuildCartProjection",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
      )

      NamespacePlanGenerator.make(
        mkTenant = () => tenantName,
        mkName = _ => namespaceName,
        mkTopicsCount = _ => topicPlanGenerators.size,
        mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
        mkAfterAllocation = _ => ()
      )

  object Events:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "ShoppingCartEvents"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[CartCreated](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartCreated",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemAdded",
          mkLoadType = _ => DemoAppTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemIncreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemIncreased",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemDecreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemDecreased",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemRemoved](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemRemoved",
          mkLoadType = _ => DemoAppTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartCheckedOut](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartCheckedOut",
          mkLoadType = _ => DemoAppTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ShippingAddressAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ShippingAddressAdded",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[BillingAddressAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "BillingAddressAdded",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartDiscarded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartDiscarded",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CreditCardAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CreditCardAdded",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DebitCardAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DebitCardAdded",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PayPalAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PayPalAdded",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
      )

      NamespacePlanGenerator.make(
        mkTenant = () => tenantName,
        mkName = _ => namespaceName,
        mkTopicsCount = _ => topicPlanGenerators.size,
        mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
        mkAfterAllocation = _ => ()
      )
