package demo.tenants.schemas

import generators.{TenantPlan, TenantPlanGenerator}
import zio.Task

object EventsTenant:
  val tenantName = s"ExampleShop-CQRS-Events-${java.time.Instant.now().toEpochMilli}"

  def mkTenantPlanGenerator: Task[TenantPlanGenerator] =
    val namespacePlanGenerators = List(
      namespaces.exampleShop.AccountNamespace.Events.mkPlanGenerator(tenantName),
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
