package demo.tenants.schemas

import generators.{TenantPlan, TenantPlanGenerator}
import zio.Task

object EventsTenant:
  val tenantName = s"CQRS-Events-${java.time.Instant.now().toEpochMilli}"

  def mkTenantPlanGenerator: Task[TenantPlanGenerator] =
    val namespacePlanGenerators = List(
      namespaces.exampleShop.AccountNamespace.Events.mkPlanGenerator(tenantName),
      namespaces.exampleShop.CatalogNamespace.Events.mkPlanGenerator(tenantName),
      namespaces.exampleShop.CommunicationNamespace.Events.mkPlanGenerator(tenantName),
      namespaces.exampleShop.IdentityNamespace.Events.mkPlanGenerator(tenantName),
      namespaces.exampleShop.OrderNamespace.Events.mkPlanGenerator(tenantName),
      namespaces.exampleShop.PaymentNamespace.Events.mkPlanGenerator(tenantName),
      namespaces.exampleShop.ShoppingCartNamespace.Events.mkPlanGenerator(tenantName),
      namespaces.exampleShop.WarehouseNamespace.Events.mkPlanGenerator(tenantName),
    )

    TenantPlanGenerator.make(
      mkName = _ => tenantName,
      mkNamespacesCount = _ => namespacePlanGenerators.size,
      mkNamespaceGenerator = namespaceIndex => namespacePlanGenerators(namespaceIndex)
    )

  def mkTenantPlan: Task[TenantPlan] = for {
    tenantPlanGenerator <- mkTenantPlanGenerator
    tenantPlan <- TenantPlan.make(tenantPlanGenerator, 0)
  } yield tenantPlan
