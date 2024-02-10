package app

import ch.qos.logback.classic.Logger
import client.{adminClient, pulsarClient}
import demo.tenants.cqrs.DemoAppTenant
import demo.tenants.cqrs.shared.DemoAppTopicConfig
import demo.tenants.schemas.SchemasTenant
import generators.*
import org.apache.pulsar.client.api.{Consumer, Producer}
import zio.{LogLevel, Runtime, Unsafe, ZIO, ZIOAppDefault}

import scala.collection.immutable.List

object DekafDemoApp extends ZIOAppDefault:

  var isAcceptingNewMessages = true
  var allConsumers: List[Consumer[Array[Byte]]] = List.empty
  var allProducers: List[Producer[Array[Byte]]] = List.empty

  def initiateGracefulShutdown(): Unit =
    isAcceptingNewMessages = false

  private def appLogic = for {
    schemasTenantPlan <- SchemasTenant.mkTenantPlan
    demoAppTenant <- DemoAppTenant.mkTenantPlan

    tenantPlans = List(
      client.config.enableDemoAppTenant.filter(identity).map(_ => demoAppTenant),
      client.config.enableSchemasTenant.filter(identity).map(_ => schemasTenantPlan)
    ).flatten

    _ <- ZIO.logInfo("Starting app...")
    _ <- DemoAppTopicConfig.logDemoAppConfig
    _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.allocateResources(tenantPlan))
    _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.start(tenantPlan))
  } yield ()

  private def cleanup = for {
    _ <- ZIO.logInfo("Stopping app...")

    _ <- ZIO.logInfo("Pausing  consumers...")
    _ <- ZIO.foreachParDiscard(allConsumers)(consumer => ZIO.attempt(consumer.pause()))

    _ <- ZIO.logInfo("Starting graceful shutdown...")
    _ <- ZIO.succeed(initiateGracefulShutdown())

    /* If we will change ConsumerBuilder.receiverQueueSize, then we need to wait
       for all consumers to finish processing messages from the queue.

    _ <- ZIO.sleep(Duration.fromSeconds(3)) */

    _ <- ZIO.logInfo("Closing consumers and producers...")
    _ <- ZIO.foreachParDiscard(allConsumers)(consumer => ZIO.attempt(consumer.close()))
    _ <- ZIO.foreachParDiscard(allProducers)(producer => ZIO.attempt(producer.close()))

    _ <- ZIO.attempt(adminClient.close())
    _ <- ZIO.attempt(pulsarClient.close())
  } yield ()

  override def run = appLogic.onExit(_ =>
    Unsafe.unsafe(implicit unsafe =>
      Runtime.default.unsafe.run(cleanup.orElseSucceed(()))
    )
  )
