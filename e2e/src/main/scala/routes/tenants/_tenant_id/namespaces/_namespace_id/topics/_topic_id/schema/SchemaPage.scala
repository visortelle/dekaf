package routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.schema

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.Locator.LocatorOptions
import com.microsoft.playwright.options.AriaRole

import java.nio.file.Paths
import scala.jdk.CollectionConverters.*

case class SchemaPage(root: Locator):
    val newSchemaButton: Locator = root.getByTestId("schema-create-button")
    val createSchemaButton: Locator = root.getByTestId("create-schema-button")
    val schemaTypeSelect: Locator = root.getByTestId("schema-type-select")
    val schemaCompatibility: Locator = root.getByTestId("schema-compatibility").locator("span")
    private val schemaEditorInput: Locator = root.getByTestId("schema-editor-input")
    val sourceSelect: Locator = root.getByTestId("schema-source-select")
    val protobufEditorInputUploadButton: Locator = root.getByTestId("protobuf-editor-input-upload-button")

    val deleteButton: Locator = root.getByTestId("schema-delete-button")
    val deleteConfirmButton: Locator = root.getByTestId("confirmation-dialog-confirm-button")
    val deleteGuardInput: Locator = root.getByTestId("confirmation-dialog-guard-input")
    val deleteForceButton: Locator = root.getByTestId("confirm-dialog-force-delete-checkbox")

    def schemasList: Seq[Locator] =
        root.getByTestId("schemas-list").all().asScala.toSeq.map(_.locator("div"))

    def isSchemaListEmpty: Boolean =
        root.getByTestId("schemas-list").all().asScala.toSeq.size == 1 &&
            root.getByTestId("schemas-list").locator("div").textContent().contains("No schemas registered for this topic")

    def schemaListItemVersion(schemaListItem: Locator): String =
        schemaListItem.locator("div", LocatorOptions().setHasText("Version")).locator("span").textContent()

    def schemaListItemType(schemaListItem: Locator): String =
        schemaListItem.locator("div", LocatorOptions().setHasText("Type")).locator("span").textContent()

    def setSchemaFile(filePathName: String): Unit =
        val fileChooser = root.page.waitForFileChooser(() => root.getByTestId("schema-upload-zone").click())

        fileChooser.setFiles(Paths.get(ClassLoader.getSystemResource(filePathName).toURI))
    
    def clearSchemaEditorInput(): Unit =
        schemaEditorInput.click()
        schemaEditorInput.press("Control+A")
        schemaEditorInput.press("Backspace")

    def setSchemaEditorInput(schema: String): Unit =
        schemaEditorInput.click()
        schemaEditorInput.`type`(schema)

object SchemaEditorSourceSelectTypes extends Enumeration:
    type SchemaEditorSourceSelectTypes = Value

    val CODE = Value("code-editor")
    val FILE = Value("single-file")
    val DIRECTORY = Value("directory")
