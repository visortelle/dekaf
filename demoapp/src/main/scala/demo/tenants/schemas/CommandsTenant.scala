package demo.tenants.schemas

import demo.tenants.schemas.namespaces.exampleShop.namespaces.{AccountNamespace, CatalogNamespace, CommunicationNamespace, IdentityNamespace, OrderNamespace, PaymentNamespace, ShoppingCartNamespace, WarehouseNamespace}
import generators.{TenantPlan, TenantPlanGenerator}
import zio.Task
object CommandsTenant:
  val tenantName = s"CQRS-Commands-${java.time.Instant.now().toEpochMilli}"

  def mkTenantPlanGenerator: Task[TenantPlanGenerator] =
    val namespacePlanGenerators = List(
      AccountNamespace.Commands.mkPlanGenerator(tenantName),
      CatalogNamespace.Commands.mkPlanGenerator(tenantName),
      CommunicationNamespace.Commands.mkPlanGenerator(tenantName),
      IdentityNamespace.Commands.mkPlanGenerator(tenantName),
      OrderNamespace.Commands.mkPlanGenerator(tenantName),
      PaymentNamespace.Commands.mkPlanGenerator(tenantName),
      ShoppingCartNamespace.Commands.mkPlanGenerator(tenantName),
      WarehouseNamespace.Commands.mkPlanGenerator(tenantName),
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
