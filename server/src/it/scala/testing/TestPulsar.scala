package testing

import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import zio.*
import org.testcontainers.containers.PulsarContainer
import org.testcontainers.utility.DockerImageName
import scala.jdk.CollectionConverters.*

val PulsarVersion = "3.2.2"

case class TestPulsar(
    container: PulsarContainer,
    pulsarWebUrl: String,
    pulsarBrokerUrl: String,
    createAdminClient: Task[PulsarAdmin],
    createPulsarClient: Task[PulsarClient],
    createTenant: Task[String],
    createNamespace: Task[String],
    createTopic: Task[String],
    createPartitionedTopic: (numPartitions: Int) => Task[String]
)

object TestPulsar:
    val live: ULayer[TestPulsar] =
        ZLayer.scoped:
            ZIO.acquireRelease(
                ZIO.attempt {
                    val env: Map[String, String] = Map("PULSAR_STANDALONE_USE_ZOOKEEPER" -> "1")
                    val container = new PulsarContainer(DockerImageName.parse(s"apachepulsar/pulsar:$PulsarVersion"))
                        .withEnv(env.asJava)
                        .withStartupTimeout(java.time.Duration.ofSeconds(120))
                    container.start()

                    def createAdminClient = ZIO.succeed(PulsarAdmin.builder().serviceHttpUrl(container.getHttpServiceUrl).build())
                    def createPulsarClient = ZIO.succeed(PulsarClient.builder().serviceUrl(container.getPulsarBrokerUrl).build())

                    def createNewTenant: Task[String] = for {
                        pulsarAdmin <- createAdminClient
                        tenantFqn <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val allowedClusters = new java.util.HashSet[String]()
                            allowedClusters.add("standalone")

                            val config = org.apache.pulsar.common.policies.data.TenantInfo.builder()
                                .allowedClusters(allowedClusters).build()
                            pulsarAdmin.tenants.createTenant(name, config)
                            name
                        }
                    } yield tenantFqn

                    def createNamespace: Task[String] = for {
                        pulsarAdmin <- createAdminClient
                        tenantName <- createNewTenant
                        namespaceFqn <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val namespaceFqn = s"$tenantName/$name"
                            pulsarAdmin.namespaces.createNamespace(namespaceFqn)
                            namespaceFqn
                        }
                    } yield namespaceFqn

                    def createTopic: Task[String] = for {
                        pulsarAdmin <- createAdminClient
                        namespaceFqn <- createNamespace
                        topicFqn <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val topicFqn = s"persistent://$namespaceFqn/$name"
                            pulsarAdmin.topics.createNonPartitionedTopic(topicFqn)
                            topicFqn
                        }
                    } yield topicFqn

                    def createPartitionedTopic(numPartitions: Int): Task[String] = for {
                        pulsarAdmin <- createAdminClient
                        namespaceFqn <- createNamespace
                        topicFqn <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val topicFqn = s"persistent://$namespaceFqn/$name"
                            pulsarAdmin.topics.createPartitionedTopic(topicFqn, numPartitions)
                            topicFqn
                        }
                    } yield topicFqn

                    TestPulsar(
                        container = container,
                        pulsarWebUrl = container.getHttpServiceUrl,
                        pulsarBrokerUrl = container.getPulsarBrokerUrl,
                        createAdminClient = createAdminClient,
                        createPulsarClient = createPulsarClient,
                        createTenant = createNewTenant,
                        createNamespace = createNamespace,
                        createTopic = createTopic,
                        createPartitionedTopic = createPartitionedTopic
                    )
                }.orDie
            )(testPulsar => ZIO.attempt(testPulsar.container.stop()).ignoreLogged)
