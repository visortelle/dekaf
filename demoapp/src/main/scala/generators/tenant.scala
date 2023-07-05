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
    def make(generator: TenantPlanGenerator, tenantIndex: TenantIndex): Task[TenantPlan] = for {
        namespacesAsPairs <- ZIO.foreach(List.range(0, generator.getNamespacesCount(tenantIndex))) { namespaceIndex =>
            for {
                namespaceGenerator <- generator.getNamespaceGenerator(namespaceIndex)
                namespacePlan <- NamespacePlan.make(namespaceGenerator, namespaceIndex)
            } yield namespacePlan.name -> namespacePlan
        }
        namespaces <- ZIO.succeed(namespacesAsPairs.toMap)
        tenantPlan <- ZIO.succeed(
            TenantPlan(
                name = generator.getName(tenantIndex),
                namespaces = namespaces
            )
        )
    } yield tenantPlan

case class TenantPlanGenerator(
    getName: TenantIndex => TenantName,
    getNamespacesCount: TenantIndex => Int,
    getNamespaceGenerator: NamespaceIndex => Task[NamespacePlanGenerator]
)

object TenantPlanGenerator:
    def make(
        getName: TenantIndex => TenantName = tenantIndex => s"tenant-$tenantIndex",
        getNamespacesCount: TenantIndex => Int = _ => 1,
        getNamespaceGenerator: NamespaceIndex => Task[NamespacePlanGenerator] = _ => NamespacePlanGenerator.make()
    ): Task[TenantPlanGenerator] =
        val tenantPlanGenerator = TenantPlanGenerator(
            getName = getName,
            getNamespacesCount = getNamespacesCount,
            getNamespaceGenerator = getNamespaceGenerator
        )
        ZIO.succeed(tenantPlanGenerator)

object TenantPlanExecutor:
    def allocateResources(tenantPlan: TenantPlan): Task[TenantPlan] = for {
        _ <- ZIO.logInfo(s"Allocating resources for tenant ${tenantPlan.name}")
        clusters <- ZIO.attempt(adminClient.clusters.getClusters.asScala.toList)
        _ <- ZIO.attempt {
            val tenantInfo = TenantInfo.builder.allowedClusters(clusters.toSet.asJava).build
            adminClient.tenants.createTenant(tenantPlan.name, tenantInfo)
        }
        _ <- ZIO
            .foreachParDiscard(tenantPlan.namespaces.values)(NamespacePlanExecutor.allocateResources)
            .withParallelism(10)
    } yield tenantPlan

    def start(tenantPlan: TenantPlan): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Starting tenant ${tenantPlan.name}")
        _ <- ZIO.foreachParDiscard(tenantPlan.namespaces.values)(NamespacePlanExecutor.start)
    } yield ()
