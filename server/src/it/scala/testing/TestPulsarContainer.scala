package testing

import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import zio.*
import org.testcontainers.containers.PulsarContainer
import org.testcontainers.utility.DockerImageName

case class TestPulsarContainer(
    container: PulsarContainer,
    getAdminClient: () => PulsarAdmin,
    getPulsarClient: () => PulsarClient
)

object TestPulsarContainer:
    val live: ULayer[TestPulsarContainer] =
        ZLayer.scoped:
            ZIO.acquireRelease(
                ZIO.attempt {
                    val container = new PulsarContainer(DockerImageName.parse("apachepulsar/pulsar:3.2.2"))
                        .withStartupTimeout(java.time.Duration.ofSeconds(120))
                    container.start()

                    TestPulsarContainer(
                        container = container,
                        getAdminClient = () => PulsarAdmin.builder().serviceHttpUrl(container.getHttpServiceUrl).build(),
                        getPulsarClient = () => PulsarClient.builder().serviceUrl(container.getPulsarBrokerUrl).build()
                    )
                }.orDie
            )(testPulsarContainer =>
                ZIO.attempt(testPulsarContainer.container.stop()).ignoreLogged
            )
