package topics.primitives

import zio.*
import _root_.client.{adminClient, pulsarClient}
import _root_.config.config
import org.apache.pulsar.common.policies.data.TenantInfo
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import org.apache.pulsar.client.api.{Producer, SubscriptionType}
import scala.jdk.CollectionConverters.*
import net.datafaker.Faker

val tenantName = s"primitives-${java.time.Instant.now().toString}"
val faker = new Faker()

val getProducersCount = () => 20
val getSubscriptionsCount = () => 7
val getConsumersPerSubscriptionCount = () => 2
val getMessagesPerSecond = () => 100
val genPayload = () =>
  def boolToByte(bool: Boolean): Byte = if bool then 1 else 0
  Array(boolToByte(faker.bool.bool))
val getSubscriptionType = () => SubscriptionType.Shared
val getSchemaInfo = () => SchemaInfo.builder.name("coin").`type`(SchemaType.BOOLEAN).build

object Primitives:
    def startProduce(): Task[Unit] = for
        _ <- ZIO.attempt {
            val tenantInfo = TenantInfo.builder.allowedClusters(config.clusterNames.toSet.asJava).build
            adminClient.tenants.createTenant(s"$tenantName", tenantInfo)
        }

        _ <- CoinTosses.prepareEnv()
        producersFib <- CoinTosses.startProduce().fork
        _ <- CoinTosses.startConsume().fork
        _ <- producersFib.join
    yield ()

object CoinTosses:
    private val namespaceName = "bool"
    private val topicFqn = s"persistent://$tenantName/$namespaceName/coin-tosses"
    private val schema = getSchemaInfo()

    def prepareEnv(): Task[Unit] = for {
        _ <- ZIO.attempt(adminClient.namespaces.createNamespaceAsync(s"$tenantName/$namespaceName"))
        _ <- ZIO.attempt(adminClient.topics.createPartitionedTopic(topicFqn, 5))
        _ <- ZIO.attempt(adminClient.schemas.createSchema(topicFqn, schema))
    } yield ()

    def startProduce() =
        val producers = List.tabulate(getProducersCount())(i => pulsarClient.newProducer.producerName(s"producer-$i").topic(topicFqn).create)

        def produceEntry: Task[Unit] = for {
            _ <- {
                val payload = genPayload()
                ZIO.foreachPar(producers)(producer => ZIO.attempt(producer.sendAsync(payload)))
            }
        } yield ()

        def schedule = Schedule.fixed(Duration.fromNanos(1000_000_000 / getMessagesPerSecond()))
        produceEntry.repeat(schedule)

    def startConsume() =
        def makeConsumers(subscriptionName: String, consumersCount: Int) = List.tabulate(consumersCount) { i =>
            pulsarClient.newConsumer
                .subscriptionName(subscriptionName)
                .subscriptionType(getSubscriptionType())
                .consumerName(s"consumer-$i")
                .topic(topicFqn)
                .messageListener((consumer, msg) => consumer.acknowledge(msg))
        }

        val subscriptions = List.tabulate(getSubscriptionsCount())(i => s"subscription-$i")
        val consumers = subscriptions
          .flatMap(subscriptionName => makeConsumers(subscriptionName, getConsumersPerSubscriptionCount()))

        ZIO.foreachPar(consumers)(consumer => ZIO.attempt(consumer.subscribe))
