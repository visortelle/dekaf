package demo.tenants.cqrs.namespaces

import demo.tenants.cqrs.shared.DemoappTopicConfig
import demo.tenants.cqrs.model.Payment.*
import demo.tenants.cqrs.shared.mkConfigurableTopicPlanGenerator
import generators.{NamespacePlanGenerator, TenantName}
import org.apache.pulsar.client.api.SubscriptionType

object PaymentNamespace:
  object Commands:
    def mkPlanGenerator(tenantName: TenantName) =
      val namespaceName = "PaymentCommands"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[RequestPayment](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RequestPayment",
          mkLoadType = _ => DemoappTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[ProceedWithPayment](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "ProceedWithPayment",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CancelPayment](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CancelPayment",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[AuthorizePaymentMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "AuthorizePaymentMethod",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DenyPaymentMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DenyPaymentMethod",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CancelPaymentMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CancelPaymentMethod",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[RefundPaymentMethod](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "RefundPaymentMethod",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DenyPaymentMethodRefund](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DenyPaymentMethodRefund",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DenyPaymentMethodCancellation](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DenyPaymentMethodCancellation",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
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
      val namespaceName = "PaymentEvents"

      val topicPlanGenerators = List(
        mkConfigurableTopicPlanGenerator[PaymentRequested](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentRequested",
          mkLoadType = _ => DemoappTopicConfig.Overloaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentCanceled](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentCanceled",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentCompleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentCompleted",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentNotCompleted](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentNotCompleted",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentMethodAuthorized](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentMethodAuthorized",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentMethodDenied](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentMethodDenied",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentMethodRefunded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentMethodRefunded",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentMethodRefundDenied](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentMethodRefundDenied",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentMethodCancellationDenied](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentMethodCancellationDenied",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PaymentMethodCanceled](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PaymentMethodCanceled",
          mkLoadType = _ => DemoappTopicConfig.ModeratelyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[CreditCardAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "CreditCardAdded",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[DebitCardAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "DebitCardAdded",
          mkLoadType = _ => DemoappTopicConfig.HeavilyLoaded,
          mkSubscriptionType = _ => SubscriptionType.Shared,
        ),
        mkConfigurableTopicPlanGenerator[PayPalAdded](
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => "PayPalAdded",
          mkLoadType = _ => DemoappTopicConfig.LightlyLoaded,
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
