package demo.tenants.schemas.namespaces.exampleShop

import _root_.demo.tenants.schemas.namespaces.TopicConfig
import demo.tenants.schemas.namespaces.exampleShop.commands.Catalog.*
import demo.tenants.schemas.namespaces.exampleShop.events.Catalog.*
import generators.{NamespacePlanGenerator, TenantName, TopicPlanGenerator}
import demo.tenants.schemas.namespaces.exampleShop.shared.mkConfigurableTopicPlanGenerator
import org.apache.pulsar.client.api.SubscriptionType

object CatalogNamespace:
    object Commands:
      def mkPlanGenerator(tenantName: TenantName) =
        val namespaceName = "CatalogCommands"

        val topicPlanGenerators = List(
          mkConfigurableTopicPlanGenerator[ActivateCatalog](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "ActivateCatalog",
            mkLoadType = _ => TopicConfig.ModeratelyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Shared,
          ),
          mkConfigurableTopicPlanGenerator[AddCatalogItem](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "AddCatalogItem",
            mkLoadType = _ => TopicConfig.Overloaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[ChangeCatalogDescription](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "ChangeCatalogDescription",
            mkLoadType = _ => TopicConfig.LightlyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[ChangeCatalogTitle](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "ChangeCatalogTitle",
            mkLoadType = _ => TopicConfig.LightlyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[CreateCatalog](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CreateCatalog",
            mkLoadType = _ => TopicConfig.HeavilyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Failover
          ),
          mkConfigurableTopicPlanGenerator[DeactivateCatalog](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "DeactivateCatalog",
            mkLoadType = _ => TopicConfig.ModeratelyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Failover
          ),
          mkConfigurableTopicPlanGenerator[DeleteCatalog](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "DeleteCatalog",
            mkLoadType = _ => TopicConfig.ModeratelyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Failover
          ),
          mkConfigurableTopicPlanGenerator[RemoveCatalogItem](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "RemoveCatalogItem",
            mkLoadType = _ => TopicConfig.Overloaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
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
        val namespaceName = "CatalogEvents"

        val topicPlanGenerators = List(
          mkConfigurableTopicPlanGenerator[CatalogCreated](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogCreated",
            mkLoadType = _ => TopicConfig.HeavilyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Failover
          ),
          mkConfigurableTopicPlanGenerator[CatalogDeleted](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogDeleted",
            mkLoadType = _ => TopicConfig.ModeratelyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Failover
          ),
          mkConfigurableTopicPlanGenerator[CatalogActivated](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogActivated",
            mkLoadType = _ => TopicConfig.ModeratelyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[CatalogDeactivated](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogDeactivated",
            mkLoadType = _ => TopicConfig.ModeratelyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Failover
          ),
          mkConfigurableTopicPlanGenerator[CatalogTitleChanged](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogTitleChanged",
            mkLoadType = _ => TopicConfig.LightlyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[CatalogDescriptionChanged](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogDescriptionChanged",
            mkLoadType = _ => TopicConfig.LightlyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[CatalogItemAdded](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogItemAdded",
            mkLoadType = _ => TopicConfig.Overloaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[CatalogItemRemoved](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogItemRemoved",
            mkLoadType = _ => TopicConfig.Overloaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          ),
          mkConfigurableTopicPlanGenerator[CatalogItemIncreased](
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => "CatalogItemIncreased",
            mkLoadType = _ => TopicConfig.HeavilyLoaded,
            mkSubscriptionType = _ => SubscriptionType.Shared
          )
        )

        NamespacePlanGenerator.make(
          mkTenant = () => tenantName,
          mkName = _ => namespaceName,
          mkTopicsCount = _ => topicPlanGenerators.size,
          mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
          mkAfterAllocation = _ => ()
        )
        
        