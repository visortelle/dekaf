package test_env

import com.microsoft.playwright.*
import com.microsoft.playwright.Browser.NewPageOptions
import com.microsoft.playwright.options.ViewportSize
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.url.URL
import org.apache.pulsar.client.impl.auth.oauth2.AuthenticationFactoryOAuth2

import java.util.Base64
import scala.io.Source

case class PulsarCluster(
    brokersCount: Int,
    bookiesCount: Int,
    brokerConf: String
)

case class TextEnvConfig(pulsarClusters: List[PulsarCluster])

case class TestEnv(config: TextEnvConfig):
    private val publicBaseUrl = "http://localhost:8090"
    private val isDebug = true
    private val playwright: Playwright = Playwright.create
    private val browser: Browser = playwright.chromium.launch(new BrowserType.LaunchOptions().setHeadless(!isDebug))

    def createNewPage(): Page =
        val newPageOptions = new NewPageOptions()
            .setViewportSize(new ViewportSize(1280, 800))
            .setBaseURL(publicBaseUrl)
        browser.newPage(newPageOptions)


object TestEnv:
    def createPulsarStandaloneEnv: TestEnv = TestEnv(TextEnvConfig(
        pulsarClusters = List(
            PulsarCluster(
                brokersCount = 1,
                bookiesCount = 1,
                brokerConf = ""
            )
        )
    ))

    def createPulsarAdminClient: PulsarAdmin =
        val privateKeySource = Source.fromResource("auth/default_oauth2_private_key.json")
        val privateKey = "data:application/json;base64," + Base64.getEncoder.encodeToString(privateKeySource.mkString.getBytes)
        privateKeySource.close()

        PulsarAdmin.builder()
            .serviceHttpUrl("https://cluster-f.o-xy6ek.snio.cloud")
            .authentication(AuthenticationFactoryOAuth2.clientCredentials(
                URL.createURL("https://auth.streamnative.cloud/"),
                URL.createURL(privateKey),
                "urn:sn:pulsar:o-xy6ek:instance-f",
                null
            ))
            .build
