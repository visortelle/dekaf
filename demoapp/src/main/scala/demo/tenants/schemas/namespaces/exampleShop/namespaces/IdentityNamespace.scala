package demo.tenants.schemas.namespaces.exampleShop.namespaces

import demo.tenants.schemas.namespaces.TopicConfig
import demo.tenants.schemas.namespaces.exampleShop.commands.Identity.*
import demo.tenants.schemas.namespaces.exampleShop.events.Identity.*
import demo.tenants.schemas.namespaces.exampleShop.shared.mkConfigurableTopicPlanGenerator
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
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ConfirmEmail](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ConfirmEmail",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ExpiryEmail](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ExpiryEmail",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RegisterUser](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RegisterUser",
          mkLoadType = _ => TopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ChangePassword](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ChangePassword",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DefinePrimaryEmail](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DefinePrimaryEmail",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DeleteUser](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DeleteUser",
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
      val namespaceName = "IdentityEvents"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[UserDeleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "UserDeleted",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[UserRegistered](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "UserRegistered",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[EmailChanged](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "EmailChanged",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[UserPasswordChanged](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "UserPasswordChanged",
          mkLoadType = _ => TopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[EmailConfirmed](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "EmailConfirmed",
          mkLoadType = _ => TopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[EmailExpired](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "EmailExpired",
          mkLoadType = _ => TopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PrimaryEmailDefined](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PrimaryEmailDefined",
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
