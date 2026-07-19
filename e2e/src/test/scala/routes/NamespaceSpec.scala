package routes

import harness.DekafSuite
import harness.Eventually.eventually
import ui.ConfirmationDialog
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import com.microsoft.playwright.Page.GetByRoleOptions
import scala.jdk.CollectionConverters.*

class NamespaceSpec extends DekafSuite:
  private def createButton = page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

  test("NS-3: create a non-partitioned topic") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val topic = fixtures.unique("topic")
    val fqn = s"persistent://$tenant/$ns/$topic"
    page.navigate(s"/tenants/$tenant/namespaces/$ns/create-topic")
    page.getByTestId("create-topic-name").fill(topic)
    // The form defaults to 'partitioned' - select non-partitioned explicitly.
    page.getByTestId("create-topic-partitioning").selectOption(new SelectOption().setValue("non-partitioned"))
    createButton.click()
    // Oracle: PulsarAdmin reports it as a real non-partitioned topic (partitions == 0), listed by exact FQN.
    eventually() {
      assert(admin.topics().getList(s"$tenant/$ns").asScala.contains(fqn), "topic not in non-partitioned list")
      assert(admin.topics().getPartitionedTopicMetadata(fqn).partitions == 0, "topic is partitioned")
    }
  }

  test("NS-3: create a partitioned topic") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val topic = fixtures.unique("ptopic")
    val fqn = s"persistent://$tenant/$ns/$topic"
    page.navigate(s"/tenants/$tenant/namespaces/$ns/create-topic")
    page.getByTestId("create-topic-name").fill(topic)
    page.getByTestId("create-topic-partitioning").selectOption(new SelectOption().setValue("partitioned"))
    createButton.click()
    // Oracle: partition metadata reports N > 0 partitions.
    eventually() {
      assert(admin.topics().getPartitionedTopicMetadata(fqn).partitions > 0,
        s"expected partitioned, got ${admin.topics().getPartitionedTopicMetadata(fqn).partitions}")
    }
  }

  test("NS-9: delete a namespace") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    page.navigate(s"/tenants/$tenant/namespaces/$ns/overview")
    page.getByTestId("namespace-page-delete-button").click()
    ConfirmationDialog(page).confirm(guard = Some(ns), force = true)
    page.waitForTimeout(1500)
    assert(!admin.namespaces().getNamespaces(tenant).asScala.contains(s"$tenant/$ns"))
  }
