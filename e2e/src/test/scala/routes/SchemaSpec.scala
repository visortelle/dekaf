package routes

import harness.DekafSuite
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import org.apache.pulsar.common.policies.data.SchemaCompatibilityStrategy
import java.nio.file.Files
import java.util.regex.Pattern
import scala.jdk.CollectionConverters.*

class SchemaSpec extends DekafSuite:

  private def visible(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms)
  private def exactText(s: String) = new com.microsoft.playwright.Page.GetByTextOptions().setExact(true)

  private def eventually(timeoutMs: Long = 15000, stepMs: Long = 300)(p: => Boolean): Boolean = {
    val deadline = System.currentTimeMillis() + timeoutMs
    var ok = false
    while (!ok && System.currentTimeMillis() < deadline) {
      ok = try p catch { case _: Throwable => false }
      if (!ok) Thread.sleep(stepMs)
    }
    ok
  }

  private def createUrl(t: String, ns: String, topic: String) =
    s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/schema/create"
  private def createButton =
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

  test("SCH-2: create an AVRO schema through the UI with live compatibility feedback") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    page.navigate(createUrl(t, ns, topic))

    page.getByTestId("schema-type-select").selectOption(new SelectOption().setLabel("AVRO"))

    // The default AVRO body is valid -> live "Compatible" verdict (see NOTES re version coupling).
    assertThat(page.getByText("Compatible", exactText("Compatible"))).isVisible(visible(20000))
    assertThat(createButton).isEnabled()
    createButton.click()

    assert(eventually() { admin.schemas().getSchemaInfo(fqn).getType == SchemaType.AVRO })
  }

  test("SCH-3: uploading an .avsc file populates the preview") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(createUrl(t, ns, topic))

    page.getByTestId("schema-type-select").selectOption(new SelectOption().setLabel("AVRO"))
    page.getByTestId("avro-source-select").selectOption(new SelectOption().setLabel("Single .avsc file"))

    val avsc = """{"type":"record","name":"UploadedSchema","namespace":"e2e","fields":[{"name":"x","type":"string"}]}"""
    val tmp = Files.createTempFile("sch3-", ".avsc")
    Files.writeString(tmp, avsc)
    fixtures.onCleanup(() => { Files.deleteIfExists(tmp); () })

    page.locator("input[type='file']").setInputFiles(tmp)

    assertThat(page.getByText("UploadedSchema").first()).isVisible(visible(15000))
  }

  test("SCH-4: create a PROTOBUF_NATIVE schema via the code compile path") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    page.navigate(createUrl(t, ns, topic))

    page.getByTestId("schema-type-select").selectOption(new SelectOption().setLabel("PROTOBUF_NATIVE"))
    // Default proto is prefilled in the code editor; compile it.
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Upload").setExact(true)).click()

    assertThat(page.getByText("Compatible", exactText("Compatible"))).isVisible(visible(25000))
    assertThat(createButton).isEnabled()
    createButton.click()

    assert(eventually() { admin.schemas().getSchemaInfo(fqn).getType == SchemaType.PROTOBUF_NATIVE })
  }

  test("SCH-5: KEY_VALUE schema type renders a stub without crashing") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(createUrl(t, ns, topic))

    page.getByTestId("schema-type-select").selectOption(new SelectOption().setLabel("KEY_VALUE"))

    assertThat(page.getByText(Pattern.compile("Support of KEY_VALUE schema type is coming"))).isVisible(visible(15000))
    assertThat(createButton).isDisabled()
  }

  test("SCH-6: view a non-latest schema version") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    // Permit the evolution, then arrange two AVRO versions (0 = alpha, 1 = alpha+bravo).
    admin.namespaces().setSchemaCompatibilityStrategy(s"$t/$ns", SchemaCompatibilityStrategy.ALWAYS_COMPATIBLE)
    val avsc0 = """{"type":"record","name":"Sch6","namespace":"e2e","fields":[{"name":"alpha","type":"string"}]}"""
    val avsc1 = """{"type":"record","name":"Sch6","namespace":"e2e","fields":[{"name":"alpha","type":"string"},{"name":"bravo","type":["null","string"],"default":null}]}"""
    admin.schemas().createSchema(fqn, SchemaInfo.builder().name(topic).`type`(SchemaType.AVRO).schema(avsc0.getBytes("UTF-8")).build())
    admin.schemas().createSchema(fqn, SchemaInfo.builder().name(topic).`type`(SchemaType.AVRO).schema(avsc1.getBytes("UTF-8")).build())

    // Landing on /schema redirects to the latest version; then select version 0 in the list.
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/schema")
    val v0 = page.getByTestId("schema-version-0")
    assertThat(v0).isVisible(visible(20000))
    v0.click()

    assertThat(page).hasURL(Pattern.compile(".*/schema/view/0.*"))
    val view = page.getByTestId("schema-view")
    assertThat(view).containsText("alpha")
    assertThat(view).not().containsText("bravo")
  }
