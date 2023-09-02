package routes.pulsar_auth

import com.microsoft.playwright.Locator.WaitForOptions
import com.microsoft.playwright.options.{AriaRole, WaitForSelectorState}
import routes.PulsocatPage
import routes.navigation.PulsarAuthModal
import test_env.{TestEnv, createPulsarStandaloneEnv}
import zio.test.{TestAspect, ZIOSpecDefault, assertTrue}
import com.microsoft.playwright.{CLI, Locator, Page}
import net.datafaker.Faker
import zio.ZIO

import scala.util.Random

val faker = new Faker()

object PulsarAuthSpec extends ZIOSpecDefault:
    def spec = suite("Test pulsar auth module")(
        suite("Test functionality") (
            test("Should default pulsar credentials exist and be current when no credential exist") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))

                pulsocatPage.pulsarAuthButton.click()

                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))

                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val defaultRow = pulsarAuthModal.credentialsRow("Default")

                defaultRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(defaultRow.isVisible) &&
                    assertTrue(pulsarAuthModal.isCredentialsRowCurrent(defaultRow))
            },
            test("Should create new empty credentials and check if it's current") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                pulsarAuthModal.addNewCredentialButton.click()

                val credentialsName = faker.lorem().characters(10)

                createEmptyCredentials(pulsarAuthModal, credentialsName)

                val newCredentialsRow = pulsarAuthModal.credentialsRow(credentialsName)

                newCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(newCredentialsRow.isVisible) &&
                    assertTrue(pulsarAuthModal.isCredentialsRowCurrent(newCredentialsRow)) &&
                    assertTrue(pulsarAuthModal.credentialsRow("Default").isVisible)
            },
            test("Should create new jwt credentials and check if it's current") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                pulsarAuthModal.addNewCredentialButton.click()

                val credentialsName = faker.lorem().characters(10)
                val credentialsToken = faker.regexify("([a-z]{20,50})\\.([a-z]{20,50})\\.([a-z]{20,50})")

                createJwtCredentials(pulsarAuthModal, credentialsName, credentialsToken)

                val newCredentialsRow = pulsarAuthModal.credentialsRow(credentialsName)

                newCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(newCredentialsRow.isVisible) &&
                    assertTrue(pulsarAuthModal.isCredentialsRowCurrent(newCredentialsRow)) &&
                    assertTrue(pulsarAuthModal.credentialsRow("Default").isVisible)
            },
            test("Should create new oauth2 credentials and check if it's current") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                pulsarAuthModal.addNewCredentialButton.click()

                val credentialsName = faker.lorem().characters(10)
                val scheme = if (new Random().nextBoolean()) then "http" else "https"
                val credentialsIssuerUrl = s"$scheme://${faker.internet().url()}"
                val credentialsAudience = faker.expression("#{bothify '?#?#?:?#?#?:?#?#?:?#?#?:?#?#?:?#?#?'}")
                val credentialsScope = faker.lorem().characters(10)

                createOauth2Credentials(pulsarAuthModal, credentialsName, credentialsIssuerUrl, credentialsAudience, credentialsScope)

                val newCredentialsRow = pulsarAuthModal.credentialsRow(credentialsName)

                newCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(newCredentialsRow.isVisible) &&
                    assertTrue(pulsarAuthModal.isCredentialsRowCurrent(newCredentialsRow)) &&
                    assertTrue(pulsarAuthModal.credentialsRow("Default").isVisible)
            },
            test("Should create several credentials and then delete them") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val emptyCredentialsName = faker.lorem().characters(10)

                val jwtCredentialsName = faker.lorem().characters(10)
                val jwtCredentialsToken = faker.regexify("([a-z]{20,50})\\.([a-z]{20,50})\\.([a-z]{20,50})")

                val oauth2CredentialsName = faker.lorem().characters(10)
                val scheme = if (new Random().nextBoolean()) then "http" else "https"
                val oauth2CredentialsIssuerUrl = s"$scheme://${faker.internet().url()}"
                val oauth2CredentialsAudience = faker.expression("#{bothify '?#?#?:?#?#?:?#?#?:?#?#?:?#?#?:?#?#?'}")
                val oauth2CredentialsScope = faker.lorem().characters(10)

                pulsarAuthModal.addNewCredentialButton.click()
                createEmptyCredentials(pulsarAuthModal, emptyCredentialsName)

                pulsarAuthModal.addNewCredentialButton.click()
                createJwtCredentials(
                    pulsarAuthModal,
                    jwtCredentialsName,
                    jwtCredentialsToken
                )

                pulsarAuthModal.addNewCredentialButton.click()
                createOauth2Credentials(
                    pulsarAuthModal,
                    oauth2CredentialsName,
                    oauth2CredentialsIssuerUrl,
                    oauth2CredentialsAudience,
                    oauth2CredentialsScope
                )

                val newEmptyCredentialsRow = pulsarAuthModal.credentialsRow(emptyCredentialsName)
                val newJwtCredentialsRow = pulsarAuthModal.credentialsRow(jwtCredentialsName)
                val newOauth2CredentialsRow = pulsarAuthModal.credentialsRow(oauth2CredentialsName)

                newEmptyCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))
                newJwtCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))
                newOauth2CredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(newEmptyCredentialsRow.isVisible) &&
                    assertTrue(newJwtCredentialsRow.isVisible) &&
                    assertTrue(newOauth2CredentialsRow.isVisible) &&
                    assertTrue(pulsarAuthModal.isCredentialsRowCurrent(newOauth2CredentialsRow)) &&
                    assertTrue(pulsarAuthModal.credentialsRow("Default").isVisible)

                pulsarAuthModal.credentialsRowDeleteButton(newEmptyCredentialsRow).click()
                pulsarAuthModal.credentialsRowDeleteButton(newJwtCredentialsRow).click()
                pulsarAuthModal.credentialsRowDeleteButton(newOauth2CredentialsRow).click()

                newEmptyCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.HIDDEN))
                newJwtCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.HIDDEN))
                newOauth2CredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.HIDDEN))

                assertTrue(newEmptyCredentialsRow.isHidden) &&
                    assertTrue(newJwtCredentialsRow.isHidden) &&
                    assertTrue(newOauth2CredentialsRow.isHidden) &&
                    assertTrue(pulsarAuthModal.credentialsRow("Default").isVisible)
            },
            test("Should create new empty credential and set the default credential current") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val credentialsName = faker.lorem().characters(10)

                pulsarAuthModal.addNewCredentialButton.click()
                createEmptyCredentials(pulsarAuthModal, credentialsName)

                val newCredentialsRow = pulsarAuthModal.credentialsRow(credentialsName)
                val defaultCredentialsRow = pulsarAuthModal.credentialsRow("Default")

                newCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(newCredentialsRow.isVisible) &&
                    assertTrue(pulsarAuthModal.isCredentialsRowCurrent(newCredentialsRow)) &&
                    assertTrue(defaultCredentialsRow.isVisible)

                pulsarAuthModal.credentialsRowSetAsCurrentButton(defaultCredentialsRow).click()

                assertTrue(pulsarAuthModal.isCredentialsRowCurrent(defaultCredentialsRow)) &&
                    assertTrue(defaultCredentialsRow.isVisible)
            },
        ),
        suite("Test edge cases") (
            test("Should display disabled delete button on default credentials") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val defaultCredentialsRow = pulsarAuthModal.credentialsRow("Default")

                defaultCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(defaultCredentialsRow.isVisible) &&
                    assertTrue(pulsarAuthModal.credentialsRowDeleteButton(defaultCredentialsRow).isDisabled)
            },
            test("Should display error when trying to create credentials with the same name") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val credentialsName = faker.lorem().characters(10)
                val credentialsToken = faker.regexify("([a-z]{20,50})\\.([a-z]{20,50})\\.([a-z]{20,50})")

                pulsarAuthModal.addNewCredentialButton.click()
                createEmptyCredentials(pulsarAuthModal, credentialsName)

                val newCredentialsRow = pulsarAuthModal.credentialsRow(credentialsName)

                newCredentialsRow.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(newCredentialsRow.isVisible) &&
                    assertTrue(pulsarAuthModal.isCredentialsRowCurrent(newCredentialsRow)) &&
                    assertTrue(pulsarAuthModal.credentialsRow("Default").isVisible)

                pulsarAuthModal.addNewCredentialButton.click()
                createJwtCredentials(
                    pulsarAuthModal,
                    credentialsName,
                    credentialsToken
                )

                val errorModal = page.getByRole(AriaRole.ALERT).getByText("Credentials with this name already exist")

                errorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(errorModal.isVisible)
            },
            test("Should display error when credentials name is contains not only alphanumerics, underscores(_) or dashes(-)") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val credentialsName = faker.lorem().characters(10) + "!%$^&*()"

                pulsarAuthModal.addNewCredentialButton.click()
                createEmptyCredentials(pulsarAuthModal, credentialsName)

                val errorModal = page.getByRole(AriaRole.ALERT).getByText("Credentials name contains illegal characters.")

                errorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(errorModal.isVisible)
            },
            test("Should display disabled save button when credentials name is empty") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                pulsarAuthModal.addNewCredentialButton.click()

                assertTrue(pulsarAuthModal.saveNewCredentialButton.isDisabled)
            },
            test("Should display error when incorrect jwt token provided") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))
                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val credentialsName = faker.lorem().characters(10)
                val credentialsToken = faker.regexify("([a-z_-]{20,50})")

                pulsarAuthModal.addNewCredentialButton.click()
                createJwtCredentials(pulsarAuthModal, credentialsName, credentialsToken)

                val errorModal = page.getByRole(AriaRole.ALERT).getByText("Incorrect credentials provided.")

                errorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(errorModal.isVisible)
            },
            test("Should display error when incorrect oauth2 issuer url provided") {
                val testEnv: TestEnv = createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                page.navigate("/")

                val pulsocatPage = PulsocatPage(page.locator("body"))
                pulsocatPage.pulsarAuthButton.click()
                val pulsarAuthModal = PulsarAuthModal(page.getByTestId("pulsar-auth-modal"))

                pulsarAuthModal.root.waitFor(WaitForOptions().setTimeout(5000))

                val credentialsName = faker.lorem().characters(10)
                val credentialsIssuerUrl = faker.lorem().characters(10)

                pulsarAuthModal.addNewCredentialButton.click()
                createOauth2Credentials(pulsarAuthModal, credentialsName, credentialsIssuerUrl, "", "")

                val errorModal = page.getByRole(AriaRole.ALERT).getByText("Incorrect credentials provided.")

                errorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

                assertTrue(errorModal.isVisible)
            },
        )
    )

    def createEmptyCredentials(pulsarAuthModal: PulsarAuthModal, credentialsName: String): Unit =
        pulsarAuthModal.newCredentialNameInput.click()
        pulsarAuthModal.newCredentialNameInput.fill(credentialsName)

        pulsarAuthModal.saveNewCredentialButton.click()

    def createJwtCredentials(pulsarAuthModal: PulsarAuthModal,
                             credentialsName: String,
                             credentialsToken: String
                            ): Unit =
        pulsarAuthModal.newCredentialNameInput.click()
        pulsarAuthModal.newCredentialNameInput.fill(credentialsName)

        pulsarAuthModal.newCredentialTypeSelect.click()
        pulsarAuthModal.newCredentialTypeSelect.selectOption("jwt")

        pulsarAuthModal.newCredentialTokenInput.click()
        pulsarAuthModal.newCredentialTokenInput.fill(credentialsToken)

        pulsarAuthModal.saveNewCredentialButton.click()

    def createOauth2Credentials(pulsarAuthModal: PulsarAuthModal,
                                credentialsName: String,
                                credentialsIssuerUrl: String,
                                credentialsAudience: String,
                                credentialsScope: String
                               ): Unit =
        pulsarAuthModal.newCredentialNameInput.click()
        pulsarAuthModal.newCredentialNameInput.fill(credentialsName)

        pulsarAuthModal.newCredentialTypeSelect.click()
        pulsarAuthModal.newCredentialTypeSelect.selectOption("oauth2")

        pulsarAuthModal.newCredentialIssuerUrlInput.click()
        pulsarAuthModal.newCredentialIssuerUrlInput.fill(credentialsIssuerUrl)

        pulsarAuthModal.setOAuthCredentialsPrivateKeyFile("auth/o-xy6ek-admin.json")

        pulsarAuthModal.newCredentialAudienceInput.click()
        pulsarAuthModal.newCredentialAudienceInput.fill(credentialsAudience)

        pulsarAuthModal.newCredentialScopeInput.click()
        pulsarAuthModal.newCredentialScopeInput.fill(credentialsScope)

        pulsarAuthModal.saveNewCredentialButton.click()
