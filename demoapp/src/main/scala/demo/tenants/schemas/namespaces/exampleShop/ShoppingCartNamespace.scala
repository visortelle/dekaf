package demo.tenants.schemas.namespaces.exampleShop

import demo.tenants.schemas.namespaces.TopicConfig
import demo.tenants.schemas.namespaces.exampleShop.commands.ShoppingCart.*
import demo.tenants.schemas.namespaces.exampleShop.events.ShoppingCart.*
import generators.{NamespacePlanGenerator, TenantName}
import demo.tenants.schemas.namespaces.exampleShop.shared.mkConfigurableTopicPlanGenerator
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
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddCreditCard](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddCreditCard",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddDebitCard](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddDebitCard",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddPayPal](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddPayPal",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddShippingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddShippingAddress",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AddBillingAddress](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AddBillingAddress",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CreateCart](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CreateCart",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CheckOutCart](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CheckOutCart",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RemoveCartItem](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RemoveCartItem",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ChangeCartItemQuantity](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ChangeCartItemQuantity",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DiscardCart](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DiscardCart",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RemovePaymentMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RemovePaymentMethod",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RebuildCartProjection](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RebuildCartProjection",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
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
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemAdded",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemIncreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemIncreased",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemDecreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemDecreased",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartItemRemoved](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartItemRemoved",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartCheckedOut](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartCheckedOut",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ShippingAddressAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ShippingAddressAdded",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[BillingAddressAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "BillingAddressAdded",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CartDiscarded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CartDiscarded",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CreditCardAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CreditCardAdded",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DebitCardAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DebitCardAdded",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PayPalAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PayPalAdded",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
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
