package demo.tenants.schemas.namespaces.exampleShop

import demo.tenants.schemas.namespaces.exampleShop.namespacesRestructured.AccountNamespace
import generators.{TenantPlan, TenantPlanGenerator}
import zio.Task

object DemoappTenant:
  val tenantName = s"Demoapp-${System.currentTimeMillis()}"
  
  def mkTenantPlanGenerator: Task[TenantPlanGenerator] =
    val namespacePlanGenerators = List(
      AccountNamespace.mkPlanGenerator(tenantName)
    )
    
    TenantPlanGenerator.make(
      mkName = _ => tenantName,
      mkNamespacesCount = _ => namespacePlanGenerators.size,
      mkNamespaceGenerator = i => namespacePlanGenerators(i),
    )
  def mkTenantPlan: Task[TenantPlan] =
    for {
      tenantGenerator <- mkTenantPlanGenerator
      tenantPlan <- TenantPlan.make(tenantGenerator, 1)
    } yield tenantPlan
