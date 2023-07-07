package demo.schemas

import zio.*
import generators.*
import net.datafaker.Faker
import _root_.client.adminClient
import demo.tenants.schemas.namespaces

val faker = new Faker()

val tenantName = s"schema-types-${java.time.Instant.now().getEpochSecond}"

object SchemasTenant:
  def mkTenantPlanGenerator =
      val namespacePlanGenerators = List(
//          namespaces.BooleanNamespace.mkPlanGenerator(tenantName),
//          namespaces.Int8Namespace.mkPlanGenerator(tenantName),
//          namespaces.Int16Namespace.mkPlanGenerator(tenantName),
//          namespaces.Int32Namespace.mkPlanGenerator(tenantName),
//          namespaces.Int64Namespace.mkPlanGenerator(tenantName),
//          namespaces.FloatNamespace.mkPlanGenerator(tenantName),
//          namespaces.DoubleNamespace.mkPlanGenerator(tenantName),
          namespaces.StringNamespace.mkPlanGenerator(tenantName),
          namespaces.BytesNamespace.mkPlanGenerator(tenantName),
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
