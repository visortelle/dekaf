package demo.schemas

import zio.*
import generators.*
import net.datafaker.Faker
import _root_.client.adminClient
import demo.tenants.schemas.namespaces.BoolsNamespace

val faker = new Faker()

val tenantName = s"schemas-${java.time.Instant.now().getEpochSecond}"

object SchemasTenant:
  def mkTenantPlanGenerator =
      val namespacePlanGenerators = List(
          BoolsNamespace.mkBoolsNamespace(tenantName)
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
