package demo.tenants.schemas.namespaces.exampleShop.namespaces

import demo.tenants.schemas.namespaces.TopicConfig
import demo.tenants.schemas.namespaces.exampleShop.commands.Order.*
import demo.tenants.schemas.namespaces.exampleShop.events.Order.*
import demo.tenants.schemas.namespaces.exampleShop.shared.mkConfigurableTopicPlanGenerator
import generators.{NamespacePlanGenerator, TenantName}
import org.apache.pulsar.client.api.SubscriptionType

object OrderNamespace:
  object Commands:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "OrderCommands"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[PlaceOrder](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PlaceOrder",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ConfirmOrder](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ConfirmOrder",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CancelOrder](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CancelOrder",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
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

  object Events:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "OrderEvents"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[OrderPlaced](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "OrderPlaced",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[OrderConfirmed](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "OrderConfirmed",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
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
