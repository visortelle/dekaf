package testing

import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import zio.*
import org.testcontainers.containers.PulsarContainer
import org.testcontainers.utility.DockerImageName

val PulsarVersion = "3.2.2"

case class TestPulsar(
    container: PulsarContainer,
    getAdminClient: Task[PulsarAdmin],
    getPulsarClient: Task[PulsarClient]
)

object TestPulsar:
    val live: ULayer[TestPulsar] =
        ZLayer.scoped:
            ZIO.acquireRelease(
                ZIO.attempt {
                    val container = new PulsarContainer(DockerImageName.parse(s"apachepulsar/pulsar:$PulsarVersion"))
                        .withStartupTimeout(java.time.Duration.ofSeconds(120))
                    container.start()

                    TestPulsar(
                        container = container,
                        getAdminClient = ZIO.succeed(PulsarAdmin.builder().serviceHttpUrl(container.getHttpServiceUrl).build()),
                        getPulsarClient = ZIO.succeed(PulsarClient.builder().serviceUrl(container.getPulsarBrokerUrl).build())
                    )
                }.orDie
            )(testPulsarContainer =>
                ZIO.attempt(testPulsarContainer.container.stop()).ignoreLogged
            )
