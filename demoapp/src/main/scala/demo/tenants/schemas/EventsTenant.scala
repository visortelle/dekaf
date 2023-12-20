package demo.tenants.schemas

import demo.tenants.schemas.namespaces.exampleShop.namespaces.{AccountNamespace, CatalogNamespace, CommunicationNamespace, IdentityNamespace, OrderNamespace, PaymentNamespace, ShoppingCartNamespace, WarehouseNamespace}
import generators.{TenantPlan, TenantPlanGenerator}
import zio.Task

object EventsTenant:
  val tenantName = s"CQRS-Events-${java.time.Instant.now().toEpochMilli}"

  def mkTenantPlanGenerator: Task[TenantPlanGenerator] =
    val namespacePlanGenerators = List(
      AccountNamespace.Events.mkPlanGenerator(tenantName),
      CatalogNamespace.Events.mkPlanGenerator(tenantName),
      CommunicationNamespace.Events.mkPlanGenerator(tenantName),
      IdentityNamespace.Events.mkPlanGenerator(tenantName),
      OrderNamespace.Events.mkPlanGenerator(tenantName),
      PaymentNamespace.Events.mkPlanGenerator(tenantName),
      ShoppingCartNamespace.Events.mkPlanGenerator(tenantName),
      WarehouseNamespace.Events.mkPlanGenerator(tenantName),
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
