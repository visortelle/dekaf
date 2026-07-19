package routes

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.SelectOption
import java.nio.file.Files

/** NAV-9/12/13/14 - Pulsar credentials. State lives in the per-browser `pulsar_auth` HttpOnly
  * cookie (every pulsar-auth route reads/writes `ctx.cookie` - nothing persists server-side),
  * so the fresh BrowserContext each test gets IS the isolation: no cleanup, no cross-test or
  * cross-run interference. */
class CredentialsSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def cnt(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)

  private def openEditor(): Unit =
    page.navigate("/overview")
    page.getByTestId("credentials-button").click()
    assertThat(page.getByTestId("modal")).isVisible(vis(10000))

  private def credRow(name: String) =
    page.locator(s"[data-testid=credentials-row][data-cred-name='$name']")

  private def currentMarker(row: com.microsoft.playwright.Locator) =
    row.getByText("Current", new com.microsoft.playwright.Locator.GetByTextOptions().setExact(true))

  test("NAV-9: add, set-current both directions, and delete a credential; Default is undeletable") {
    val name = fixtures.unique("cred").replaceAll("[^A-Za-z0-9_-]", "-")
    openEditor()

    // Add (Empty type is the default). The add route makes the new credential current - assert it.
    page.getByTestId("credentials-add").click()
    page.getByTestId("credentials-name").fill(name)
    page.getByTestId("credentials-save").click()
    val row = credRow(name)
    assertThat(row).isVisible(vis(10000))
    assertThat(currentMarker(row)).isVisible(vis(10000))

    // The seeded Default credential cannot be deleted.
    val defaultRow = credRow("Default")
    assertThat(defaultRow.getByTestId("credentials-delete")).isDisabled()

    // Switch current away to Default, then BACK to ours - both directions from a real not-current state.
    defaultRow.getByTestId("credentials-set-current").click()
    assertThat(currentMarker(defaultRow)).isVisible(vis(10000))
    row.getByTestId("credentials-set-current").click()
    assertThat(currentMarker(row)).isVisible(vis(10000))

    // Restore Default as current, then delete ours.
    defaultRow.getByTestId("credentials-set-current").click()
    assertThat(currentMarker(defaultRow)).isVisible(vis(10000))
    row.getByTestId("credentials-delete").click()
    assertThat(row).hasCount(0, cnt(10000))
  }

  test("NAV-12: adding a JWT credential drives the method-specific token form") {
    val name = fixtures.unique("cred").replaceAll("[^A-Za-z0-9_-]", "-")
    openEditor()

    page.getByTestId("credentials-add").click()
    page.getByTestId("credentials-name").fill(name)
    // Switch the method to JWT - its token field only renders for the JWT type.
    page.getByTestId("credentials-method-select").selectOption(new SelectOption().setLabel("JWT"))
    page.getByTestId("credentials-jwt-token").fill(s"header.$name.signature")
    page.getByTestId("credentials-save").click()

    assertThat(credRow(name)).isVisible(vis(10000))
  }

  test("NAV-13: adding an OAuth2 credential drives its inputs + private-key file upload") {
    val name = fixtures.unique("cred").replaceAll("[^A-Za-z0-9_-]", "-")
    // A valid, small JSON key file for the UploadZone (rc-upload reads it, parses JSON, base64s it).
    val keyFile = Files.createTempFile("e2e-oauth2-key", ".json")
    Files.writeString(keyFile, """{"client_id":"e2e","client_secret":"secret"}""")
    fixtures.onCleanup(() => Files.deleteIfExists(keyFile))

    openEditor()
    page.getByTestId("credentials-add").click()
    page.getByTestId("credentials-name").fill(name)
    page.getByTestId("credentials-method-select").selectOption(new SelectOption().setLabel("OAuth2"))
    page.getByTestId("credentials-oauth2-issuer").fill("https://issuer.example.com/")
    page.getByTestId("credentials-oauth2-audience").fill("urn:e2e:audience")
    // Drive the hidden rc-upload file input (scoped to the modal) and confirm the key registered.
    page.getByTestId("modal").locator("input[type=file]").setInputFiles(keyFile)
    assertThat(page.getByText("File loaded!")).isVisible(vis(10000))
    page.getByTestId("credentials-save").click()

    assertThat(credRow(name)).isVisible(vis(10000))
  }

  test("NAV-14: adding an Auth-Params-String credential drives its plugin/params form") {
    // Formerly BUG-19: `maskedCredentialsFromPb` had no AUTH_PARAMS_STRING case and default-threw,
    // so the saved credential never rendered. Fixed in conversions.ts - this is now the ordinary
    // coverage for the fourth credential method.
    val name = fixtures.unique("cred").replaceAll("[^A-Za-z0-9_-]", "-")
    openEditor()

    page.getByTestId("credentials-add").click()
    page.getByTestId("credentials-name").fill(name)
    page.getByTestId("credentials-method-select").selectOption(new SelectOption().setLabel("Auth Params String"))
    page.getByTestId("credentials-authparams-plugin").fill("org.apache.pulsar.client.impl.auth.AuthenticationBasic")
    page.getByTestId("credentials-authparams-params").fill("userId:e2e,password:secret")
    page.getByTestId("credentials-save").click()

    val row = credRow(name)
    assertThat(row).isVisible(vis(10000))
    // The type cell must show the real label, not "Unknown" (credentialsTypeToLabel had no case).
    assertThat(row).containsText("Auth Params String")
  }
