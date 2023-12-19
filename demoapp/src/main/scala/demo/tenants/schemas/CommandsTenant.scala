package demo.tenants.schemas

import generators.{TenantPlan, TenantPlanGenerator}
import zio.Task
object CommandsTenant:
  val tenantName = s"CQRS-Commands-${java.time.Instant.now().toEpochMilli}"

  def mkTenantPlanGenerator: Task[TenantPlanGenerator] =
    val namespacePlanGenerators = List(
      namespaces.exampleShop.AccountNamespace.Commands.mkPlanGenerator(tenantName),
      namespaces.exampleShop.CatalogNamespace.Commands.mkPlanGenerator(tenantName),
      namespaces.exampleShop.CommunicationNamespace.Commands.mkPlanGenerator(tenantName),
      namespaces.exampleShop.IdentityNamespace.Commands.mkPlanGenerator(tenantName),
      namespaces.exampleShop.OrderNamespace.Commands.mkPlanGenerator(tenantName),
      namespaces.exampleShop.PaymentNamespace.Commands.mkPlanGenerator(tenantName),
      namespaces.exampleShop.ShoppingCartNamespace.Commands.mkPlanGenerator(tenantName),
      namespaces.exampleShop.WarehouseNamespace.Commands.mkPlanGenerator(tenantName),
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
