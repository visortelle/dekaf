package demo.tenants.cqrs.namespaces

import demo.tenants.cqrs.shared.DemoAppTopicConfig
import demo.tenants.cqrs.model.Identity.*
import demo.tenants.cqrs.shared.mkConfigurableTopicPlanGenerator
import generators.{NamespacePlanGenerator, TenantName}
import org.apache.pulsar.client.api.SubscriptionType

object IdentityNamespace:
  object Commands:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "IdentityCommands"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[ChangeEmail](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ChangeEmail",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ConfirmEmail](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ConfirmEmail",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ExpiryEmail](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ExpiryEmail",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RegisterUser](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RegisterUser",
          mkLoadType = _ => DemoAppTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ChangePassword](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ChangePassword",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DefinePrimaryEmail](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DefinePrimaryEmail",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DeleteUser](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DeleteUser",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
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
      val namespaceName = "IdentityEvents"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[UserDeleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "UserDeleted",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[UserRegistered](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "UserRegistered",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[EmailChanged](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "EmailChanged",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[UserPasswordChanged](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "UserPasswordChanged",
          mkLoadType = _ => DemoAppTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[EmailConfirmed](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "EmailConfirmed",
          mkLoadType = _ => DemoAppTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[EmailExpired](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "EmailExpired",
          mkLoadType = _ => DemoAppTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PrimaryEmailDefined](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PrimaryEmailDefined",
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
