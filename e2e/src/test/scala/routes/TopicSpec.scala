package routes

import harness.DekafSuite
import ui.ConfirmationDialog
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import java.util.regex.Pattern
import scala.jdk.CollectionConverters.*

class TopicSpec extends DekafSuite:
  private def createButton = page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

  test("TOP-7: create a subscription") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val sub = fixtures.unique("sub")
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/create-subscription")
    page.getByTestId("create-subscription-name").fill(sub)
    createButton.click()
    page.waitForTimeout(1000)
    assert(admin.topics().getSubscriptions(fqn).asScala.contains(sub))
  }

  test("TOP-10: delete a topic") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    page.getByTestId("topic-page-delete-button").click()
    ConfirmationDialog(page).confirm(guard = Some(fqn), force = true)
    page.waitForTimeout(1500)
    assert(!admin.topics().getList(s"$t/$ns").asScala.exists(_.contains(topic)))
  }

  test("SCH-1: schema page redirects to /create when the topic has no schema") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/schema")
    assertThat(page).hasURL(Pattern.compile(".*/schema/create.*"))
  }

  test("SCH-7: delete a topic's schema") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val schema = SchemaInfo.builder().name(topic).`type`(SchemaType.INT32).build()
    admin.schemas().createSchema(fqn, schema)

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/schema")
    page.getByTestId("schema-delete-button").click()
    ConfirmationDialog(page).confirm(guard = Some(topic), force = true)
    page.waitForTimeout(1500)

    val deleted =
      try { admin.schemas().getSchemaInfo(fqn); false }
      catch { case _: Throwable => true }
    assert(deleted)
  }
