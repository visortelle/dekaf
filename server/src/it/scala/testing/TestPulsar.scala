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
    createTenant: Task[PulsarResources.Tenant],
    createNamespace: Task[PulsarResources.Namespace],
    createTopic: Task[PulsarResources.Topic],
    createPartitionedTopic: (numPartitions: Int) => Task[PulsarResources.Topic]
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

                    def createTenant: Task[PulsarResources.Tenant] = for {
                        pulsarAdmin <- createAdminClient
                        tenant <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val allowedClusters = new java.util.HashSet[String]()
                            allowedClusters.add("standalone")

                            val config = org.apache.pulsar.common.policies.data.TenantInfo.builder()
                                .allowedClusters(allowedClusters).build()
                            pulsarAdmin.tenants.createTenant(name, config)

                            PulsarResources.Tenant(name = name)
                        }
                    } yield tenant

                    def createNamespace: Task[PulsarResources.Namespace] = for {
                        pulsarAdmin <- createAdminClient
                        tenant <- createTenant
                        namespace <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val namespaceFqn = s"${tenant.fqn}/$name"
                            pulsarAdmin.namespaces.createNamespace(namespaceFqn)

                            PulsarResources.Namespace(tenant = tenant, name = name)
                        }
                    } yield namespace

                    def createTopic: Task[PulsarResources.Topic] = for {
                        pulsarAdmin <- createAdminClient
                        namespace <- createNamespace
                        topic <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val topicFqn = s"persistent://${namespace.fqn}/$name"
                            pulsarAdmin.topics.createNonPartitionedTopic(topicFqn)

                            PulsarResources.Topic(
                                persistency = PulsarResources.TopicPersistency.Persistent,
                                namespace = namespace,
                                name = name
                            )
                        }
                    } yield topic

                    def createPartitionedTopic(numPartitions: Int): Task[PulsarResources.Topic] = for {
                        pulsarAdmin <- createAdminClient
                        namespace <- createNamespace
                        topic <- ZIO.attempt {
                            val name = java.util.UUID.randomUUID().toString
                            val topicFqn = s"persistent://${namespace.fqn}/$name"
                            pulsarAdmin.topics.createPartitionedTopic(topicFqn, numPartitions)
                            
                            PulsarResources.Topic(
                                persistency = PulsarResources.TopicPersistency.Persistent,
                                namespace = namespace,
                                name = name
                            )
                        }
                    } yield topic

                    TestPulsar(
                        container = container,
                        pulsarWebUrl = container.getHttpServiceUrl,
                        pulsarBrokerUrl = container.getPulsarBrokerUrl,
                        createAdminClient = createAdminClient,
                        createPulsarClient = createPulsarClient,
                        createTenant = createTenant,
                        createNamespace = createNamespace,
                        createTopic = createTopic,
                        createPartitionedTopic = createPartitionedTopic
                    )
                }.orDie
            )(testPulsar => ZIO.attempt(testPulsar.container.stop()).ignoreLogged)
