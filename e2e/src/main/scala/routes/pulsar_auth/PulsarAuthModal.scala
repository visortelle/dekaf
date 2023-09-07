package routes.pulsar_auth

import com.microsoft.playwright.FileChooser.SetFilesOptions
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByRoleOptions, LocatorOptions}
import com.microsoft.playwright.options.AriaRole

import java.nio.file.Paths
import scala.io.Source

case class PulsarAuthModal(root: Locator):
    val doneButton: Locator = root.getByTestId("pulsar-auth-done-button")
    val addNewCredentialButton: Locator = root.getByTestId("pulsar-auth-add-new-credentials-button")
    val cancelAddingNewCredentialButton: Locator = root.getByTestId("pulsar-auth-cancel-add-new-credentials-button")
    val saveNewCredentialButton: Locator = root.getByTestId("pulsar-auth-save-new-credentials-button")
    val newCredentialNameInput: Locator = root.getByTestId("pulsar-auth-credentials-name-input")
    val newCredentialTypeSelect: Locator = root.getByTestId("pulsar-auth-credentials-type-select")
    val newCredentialTokenInput: Locator = root.getByTestId("pulsar-auth-credentials-token-input")
    val newCredentialIssuerUrlInput: Locator = root.getByTestId("pulsar-auth-credentials-issuer-url-input")
    val newCredentialAudienceInput: Locator = root.getByTestId("pulsar-auth-credentials-audience-input")
    val newCredentialScopeInput: Locator = root.getByTestId("pulsar-auth-credentials-scope-input")

    def credentialsRow(name: String): Locator =
        root.getByRole(AriaRole.ROW).filter(new Locator.FilterOptions().setHasText(name))
    def credentialsRowSetAsCurrentButton(credentialsRow: Locator): Locator =
        credentialsRow.getByRole(
                AriaRole.BUTTON,
                GetByRoleOptions()
                    .setName("Set as current")
                    .setExact(true)
            )
    def credentialsRowDeleteButton(credentialsRow: Locator): Locator =
        credentialsRow.getByRole(
                AriaRole.BUTTON,
                GetByRoleOptions()
                    .setName("Delete")
                    .setExact(true)
            )

    def isCredentialsRowCurrent(credentialsRow: Locator): Boolean =
        credentialsRow.getByTestId("pulsar-auth-credentials-is-current").locator("strong").innerText() == "Current"

    def setOAuthCredentialsPrivateKeyFile(filePathName: String): Unit =
        val fileChooser = root.page.waitForFileChooser(() => root.getByTestId("pulsar-auth-oauth2-private-key-upload-zone").click())

        fileChooser.setFiles(Paths.get(ClassLoader.getSystemResource(filePathName).toURI))


