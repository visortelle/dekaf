package generators

import zio.*
import _root_.client.{adminClient, pulsarClient}
import org.apache.pulsar.common.policies.data.TenantInfo

import scala.jdk.CollectionConverters.*

type TenantName = String
type TenantIndex = Int

case class TenantPlan(
    name: TenantName,
    namespaces: Map[NamespaceName, NamespacePlan]
)

object TenantPlan:
    def make(generator: TenantPlanGenerator, tenantIndex: TenantIndex): TenantPlan =
        val namespaces = List
            .tabulate(generator.getNamespacesCount(tenantIndex)) { namespaceIndex =>
                val namespaceGenerator = generator.getNamespaceGenerator(namespaceIndex)
                val namespacePlan = NamespacePlan.make(namespaceGenerator, namespaceIndex)
                namespacePlan.name -> namespacePlan
            }
            .toMap

        TenantPlan(
            name = generator.getName(tenantIndex),
            namespaces = namespaces
        )

case class TenantPlanGenerator(
    getName: TenantIndex => TenantName,
    getNamespacesCount: TenantIndex => Int,
    getNamespaceGenerator: NamespaceIndex => NamespacePlanGenerator
)

object TenantPlanGenerator:
    def make(
        getName: TenantIndex => TenantName = tenantIndex => s"tenant-$tenantIndex",
        getNamespacesCount: TenantIndex => Int = _ => 1,
        getNamespaceGenerator: NamespaceIndex => NamespacePlanGenerator = _ => NamespacePlanGenerator.make()
    ): TenantPlanGenerator =
        TenantPlanGenerator(
            getName = getName,
            getNamespacesCount = getNamespacesCount,
            getNamespaceGenerator = getNamespaceGenerator
        )

object TenantPlanExecutor:
    def allocateResources(tenantPlan: TenantPlan): Task[TenantPlan] = for {
        _ <- ZIO.logInfo(s"Allocating resources for tenant ${tenantPlan.name}")
        clusters <- ZIO.attempt(adminClient.clusters.getClusters.asScala.toList)
        _ <- ZIO.attempt {
            val isTenantExists = adminClient.tenants.getTenants.asScala.contains(tenantPlan.name)
            if !isTenantExists then
                val tenantInfo = TenantInfo.builder.allowedClusters(clusters.toSet.asJava).build
                adminClient.tenants.createTenant(tenantPlan.name, tenantInfo)
        }
        _ <- ZIO.foreachPar(tenantPlan.namespaces.values)(NamespacePlanExecutor.allocateResources).withParallelism(10)
    } yield tenantPlan

    def start(tenantPlan: TenantPlan): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Starting tenant ${tenantPlan.name}")
        _ <- ZIO.foreachParDiscard(tenantPlan.namespaces.values)(NamespacePlanExecutor.start)
    } yield ()
