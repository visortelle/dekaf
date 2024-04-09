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
    getAdminClient: Task[PulsarAdmin],
    getPulsarClient: Task[PulsarClient],
    getNewTenant: Task[String],
    getNewNamespace: Task[String],
    getNewTopic: Task[String],
    getNewPartitionedTopic: (numPartitions: Int) => Task[String]
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

                    def getAdminClient = ZIO.succeed(PulsarAdmin.builder().serviceHttpUrl(container.getHttpServiceUrl).build())
                    def getPulsarClient = ZIO.succeed(PulsarClient.builder().serviceUrl(container.getPulsarBrokerUrl).build())

                    def getNewTenant: Task[String] = for {
                        pulsarAdmin <- getAdminClient
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

                    def getNewNamespace: Task[String] = for {
                        pulsarAdmin <- getAdminClient
                        tenantName <- getNewTenant
                        namespaceFqn <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val namespaceFqn = s"$tenantName/$name"
                            pulsarAdmin.namespaces.createNamespace(namespaceFqn)
                            namespaceFqn
                        }
                    } yield namespaceFqn

                    def getNewTopic: Task[String] = for {
                        pulsarAdmin <- getAdminClient
                        namespaceFqn <- getNewNamespace
                        topicFqn <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val topicFqn = s"persistent://$namespaceFqn/$name"
                            pulsarAdmin.topics.createNonPartitionedTopic(topicFqn)
                            topicFqn
                        }
                    } yield topicFqn

                    def getNewPartitionedTopic(numPartitions: Int): Task[String] = for {
                        pulsarAdmin <- getAdminClient
                        namespaceFqn <- getNewNamespace
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
                        getAdminClient = getAdminClient,
                        getPulsarClient = getPulsarClient,
                        getNewTenant = getNewTenant,
                        getNewNamespace = getNewNamespace,
                        getNewTopic = getNewTopic,
                        getNewPartitionedTopic = getNewPartitionedTopic
                    )
                }.orDie
            )(testPulsar => ZIO.attempt(testPulsar.container.stop()).ignoreLogged)
