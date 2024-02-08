package demo.tenants.cqrs.namespaces

import demo.tenants.cqrs.shared.DemoAppTopicConfig
import demo.tenants.cqrs.model.Communication.*
import demo.tenants.cqrs.shared.mkConfigurableTopicPlanGenerator
import generators.{NamespacePlanGenerator, TenantName}
import org.apache.pulsar.client.api.SubscriptionType

object CommunicationNamespace:
  object Commands:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "CommunicationCommands"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[RequestNotification](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RequestNotification",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[EmitNotificationMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "EmitNotificationMethod",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[FailNotificationMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "FailNotificationMethod",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[CancelNotificationMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CancelNotificationMethod",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[SendNotificationMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "SendNotificationMethod",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ResetNotificationMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ResetNotificationMethod",
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

  object Events:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "CommunicationEvents"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[NotificationRequested](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "NotificationRequested",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[NotificationMethodFailed](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "NotificationMethodFailed",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Failover,
        ),
        mkConfigurableTopicPlanGenerator[NotificationMethodSent](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "NotificationMethodSent",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[NotificationMethodCancelled](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "NotificationMethodCancelled",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[NotificationMethodReset](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "NotificationMethodReset",
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
