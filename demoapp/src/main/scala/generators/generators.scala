package generators

import _root_.client.{adminClient, pulsarClient}
import _root_.config.config
import net.datafaker.Faker
import org.apache.pulsar.client.api.{Producer, SubscriptionType}
import org.apache.pulsar.common.policies.data.TenantInfo
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import zio.*

import scala.jdk.CollectionConverters.*

val faker = new Faker()

type MessageIndex = Int


//object Primitives:
//    def startProduce(): Task[Unit] = for
//        _ <- ZIO.attempt {
//            val tenantInfo = TenantInfo.builder.allowedClusters(config.clusterNames.toSet.asJava).build
//            adminClient.tenants.createTenant(s"$tenantName", tenantInfo)
//        }
//
//        _ <- CoinTosses.prepareEnv()
//        producersFib <- CoinTosses.startProduce().fork
//        _ <- CoinTosses.startConsume().fork
//        _ <- producersFib.join
//    yield ()

