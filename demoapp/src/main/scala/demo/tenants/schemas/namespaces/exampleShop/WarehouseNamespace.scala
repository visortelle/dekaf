package demo.tenants.schemas.namespaces.exampleShop

import demo.tenants.schemas.namespaces.TopicConfig
import generators.{NamespacePlanGenerator, TenantName}
import demo.tenants.schemas.namespaces.exampleShop.commands.Warehouse.*
import demo.tenants.schemas.namespaces.exampleShop.events.Warehouse.*
import demo.tenants.schemas.namespaces.exampleShop.shared.mkConfigurableTopicPlanGenerator
import org.apache.pulsar.client.api.SubscriptionType

object WarehouseNamespace:
  object Commands:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "WarehouseCommands"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[ReceiveInventoryItem](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ReceiveInventoryItem",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[IncreaseInventoryAdjust](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "IncreaseInventoryAdjust",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DecreaseInventoryAdjust](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DecreaseInventoryAdjust",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ReserveInventoryItem](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ReserveInventoryItem",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CreateInventory](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CreateInventory",
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

  object Events:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "WarehouseEvents"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[InventoryCreated](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryCreated",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryItemReceived](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryItemReceived",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryAdjustmentIncreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryAdjustmentIncreased",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryAdjustmentDecreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryAdjustmentDecreased",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryAdjustmentNotDecreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryAdjustmentNotDecreased",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryReserved](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryReserved",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[StockDepleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "StockDepleted",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryNotReserved](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryNotReserved",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryItemIncreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryItemIncreased",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[InventoryItemDecreased](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "InventoryItemDecreased",
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
