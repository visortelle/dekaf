import shared.Shared.{allConsumers, allProducers, isAcceptingNewMessages}
import zio.*
import generators.*
import demo.tenants.schemas.SchemasTenant
import client.{adminClient, pulsarClient}
import demo.tenants.cqrs.DemoappTenant
import demo.tenants.cqrs.shared.DemoappTopicConfig
import org.apache.pulsar.client.api.{Consumer, Producer}

import scala.jdk.CollectionConverters.*

object DekafDemoApp extends ZIOAppDefault:
    def initiateGracefulShutdown(): Unit =
        isAcceptingNewMessages = false

    private def appLogic = for {
  /*        schemasTenantPlan <- SchemasTenant.mkTenantPlan
        commandsTenantPlan <- CommandsTenant.mkTenantPlan
        eventsTenantPlan <- EventsTenant.mkTenantPlan*/

        demoapp <- DemoappTenant.mkTenantPlan

        tenantPlans = List(
          /*schemasTenantPlan,
          commandsTenantPlan,
          eventsTenantPlan*/
          demoapp
        )

        _ <- ZIO.logInfo("Starting app...")
        _ <- DemoappTopicConfig.logDemoappConfig
        _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.allocateResources(tenantPlan))
        _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.start(tenantPlan))
    } yield ()

    private def cleanup = for {
        _ <- ZIO.logInfo("Stopping app...")

        _ <- ZIO.logInfo("Pausing  consumers...")
        _ <- ZIO.foreachParDiscard(allConsumers)(consumer => ZIO.attempt(consumer.pause()))

        _ <- ZIO.logInfo("Starting graceful shutdown...")
        _ <- ZIO.succeed(initiateGracefulShutdown())
        _ <- ZIO.sleep(Duration.fromSeconds(3))

        _ <- ZIO.logInfo("Closing consumers and producers...")
        _ <- ZIO.foreachParDiscard(allConsumers)(consumer => ZIO.attempt(consumer.close()))
        _ <- ZIO.foreachParDiscard(allProducers)(producer => ZIO.attempt(producer.close()))

        _ <- ZIO.attempt(adminClient.close())
        _ <- ZIO.attempt(pulsarClient.close())
    } yield ()

    override def run = appLogic.onExit(_ => Unsafe.unsafe(implicit unsafe => Runtime.default.unsafe.run(cleanup.orElseSucceed(()))))
