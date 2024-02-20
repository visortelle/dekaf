package demo.tenants.cqrs

import generators.*
import namespacesRestructured.*
import zio.Task

object DemoAppTenant:
    val tenantName = s"demo-shop"

    def mkTenantPlanGenerator: Task[TenantPlanGenerator] =
        val namespacePlanGenerators = List(
            AccountNamespace.mkPlanGenerator(tenantName),
            CatalogNamespace.mkPlanGenerator(tenantName),
            WarehouseNamespace.mkPlanGenerator(tenantName)
        )

        TenantPlanGenerator.make(
            mkName = _ => tenantName,
            mkNamespacesCount = _ => namespacePlanGenerators.size,
            mkNamespaceGenerator = namespaceIndex => namespacePlanGenerators(namespaceIndex)
        )

    def mkTenantPlan: Task[TenantPlan] =
        for {
            tenantGenerator <- mkTenantPlanGenerator
            tenantPlan <- TenantPlan.make(tenantGenerator, 0)
        } yield tenantPlan
