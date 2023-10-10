import zio.*
import generators.*
import demo.tenants.schemas.SchemasTenant
import client.{adminClient, pulsarClient}
import scala.jdk.CollectionConverters.*

object DekafDemoApp extends ZIOAppDefault:
    private def appLogic = for {
        schemasTenantPlan <- SchemasTenant.mkTenantPlan

        tenantPlans = List(
            schemasTenantPlan
        )

        _ <- ZIO.logInfo("Starting app...")
        _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.allocateResources(tenantPlan))
        _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.start(tenantPlan))
    } yield ()

    private def cleanup = for {
        _ <- ZIO.logInfo("Stopping app...")
        _ <- ZIO.attempt(adminClient.close())
        _ <- ZIO.attempt(pulsarClient.close())
    } yield ()

    override def run = appLogic.onExit(_ => ZIO.succeedBlocking(cleanup))
