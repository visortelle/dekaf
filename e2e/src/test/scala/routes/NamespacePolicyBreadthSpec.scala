package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import com.microsoft.playwright.Page.GetByRoleOptions
import org.apache.pulsar.common.policies.data.SchemaCompatibilityStrategy

/** Namespace Details policy-editor breadth: NS-4/NS-5 prove the shared ConfigurationTable mechanism
  * on two tabs; these persist-and-verify one representative field per remaining distinct field shape
  * (terminal select, select+duration default, dynamic-enum select, select+numeric) and cross-check
  * the write through PulsarAdmin - so a wrong field→policy wiring on any of these tabs is caught. */
class NamespacePolicyBreadthSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def saveButton =
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))

  private def openDetails(category: String): (String, String) =
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=$category")
    (tenant, ns)

  test("NS-10: Message Deduplication tab persists an enabled policy") {
    val (t, ns) = openDetails("message-deduplication")
    val fqn = s"$t/$ns"
    val select = page.getByTestId("deduplication-type-select")
    assertThat(select).isVisible(vis(15000))
    select.selectOption(new SelectOption().setLabel("Enabled"))
    saveButton.click()
    eventually() {
      assert(admin.namespaces().getDeduplicationStatus(fqn) == true,
        s"deduplication was: ${admin.namespaces().getDeduplicationStatus(fqn)}")
    }
  }

  test("NS-11: Delayed Delivery tab persists an enabled policy with its tick time") {
    val (t, ns) = openDetails("delayed-delivery")
    val fqn = s"$t/$ns"
    val select = page.getByTestId("delayed-delivery-type-select")
    assertThat(select).isVisible(vis(15000))
    select.selectOption(new SelectOption().setLabel("Enabled"))
    // Fill a NON-default tick (2s → 2000ms): the seed is 1000ms, so asserting 2000 proves the
    // value input's wiring, not just the select's seed.
    page.getByTestId("delayed-delivery-tick-input").fill("2")
    saveButton.click()
    eventually() {
      val p = admin.namespaces().getDelayedDelivery(fqn)
      assert(p != null && p.isActive && p.getTickTime == 2000L, s"delayed-delivery was: $p")
    }
  }

  test("NS-12: Schema tab persists the compatibility strategy") {
    val (t, ns) = openDetails("schema")
    val fqn = s"$t/$ns"
    val select = page.getByTestId("schema-compatibility-type-select")
    assertThat(select).isVisible(vis(15000))
    select.selectOption(new SelectOption().setLabel("FORWARD"))
    saveButton.click()
    eventually() {
      assert(admin.namespaces().getSchemaCompatibilityStrategy(fqn) == SchemaCompatibilityStrategy.FORWARD,
        s"schema strategy was: ${admin.namespaces().getSchemaCompatibilityStrategy(fqn)}")
    }
  }

  test("NS-13: Rate Limits (dispatch rate) tab persists a specified message rate") {
    val (t, ns) = openDetails("rate-limits")
    val fqn = s"$t/$ns"
    val select = page.getByTestId("dispatch-rate-type-select")
    assertThat(select).isVisible(vis(15000))
    select.selectOption(new SelectOption().setLabel("Specified"))
    page.getByTestId("dispatch-rate-msg-input").fill("100")
    saveButton.click()
    eventually() {
      val r = admin.namespaces().getDispatchRate(fqn)
      assert(r != null && r.getDispatchThrottlingRateInMsg == 100, s"dispatch rate was: $r")
    }
  }

  test("NS-14: Tiered Storage tab reveals the driver form when a driver is chosen") {
    // Render-level: a real offload persist needs broker-configured offloaders (absent on the dev
    // standalone), so assert the driver switch reveals its provider-specific form instead.
    openDetails("tiered-storage")
    val driver = page.getByTestId("offload-driver-select")
    assertThat(driver).isVisible(vis(15000))
    driver.selectOption(new SelectOption().setLabel("aws-s3"))
    assertThat(page.getByText("Bucket").first()).isVisible(vis(10000))
    assertThat(page.getByText("Service endpoint").first()).isVisible(vis(10000))
    assertThat(page.getByText("Offloaders directory").first()).isVisible(vis(10000))
  }

  test("NS-15: Encryption tab persists a required-encryption policy") {
    val (t, ns) = openDetails("encryption")
    val fqn = s"$t/$ns"
    val select = page.getByTestId("encryption-required-type-select")
    assertThat(select).isVisible(vis(15000))
    select.selectOption(new SelectOption().setLabel("Required"))
    saveButton.click()
    eventually() {
      assert(admin.namespaces().getEncryptionRequiredStatus(fqn) == true,
        s"encryptionRequired was: ${admin.namespaces().getEncryptionRequiredStatus(fqn)}")
    }
  }

  test("NS-19: Tiered Storage persists a filesystem offload policy") {
    // The standalone accepts an offload *policy* at the metadata level (no offloaders loaded needed),
    // so the filesystem driver - unlike the credential-bearing cloud drivers - is a clean persist.
    val (t, ns) = openDetails("tiered-storage")
    val fqn = s"$t/$ns"
    val driver = page.getByTestId("offload-driver-select")
    assertThat(driver).isVisible(vis(15000))
    driver.selectOption(new SelectOption().setLabel("filesystem"))
    page.getByTestId("offload-offloaders-directory").fill("offloaders")
    page.getByTestId("offload-filesystem-profile-path").fill("conf/filesystem_offload_core_site.xml")
    saveButton.click()
    eventually() {
      val p = admin.namespaces().getOffloadPolicies(fqn)
      assert(p != null && p.getManagedLedgerOffloadDriver == "filesystem",
        s"offload driver was: ${Option(p).map(_.getManagedLedgerOffloadDriver)}")
      // Both typed values must round-trip - a driver-only assert would miss swapped/dropped fields.
      assert(p.getOffloadersDirectory == "offloaders", s"offloaders dir was: ${p.getOffloadersDirectory}")
      assert(p.getFileSystemProfilePath == "conf/filesystem_offload_core_site.xml",
        s"fs profile path was: ${p.getFileSystemProfilePath}")
    }
  }

  test("NS-20: Compute Resources tab assigns a resource group to the namespace") {
    val rg = fixtures.createResourceGroup() // must exist before the tab loads its options
    val (t, ns) = openDetails("compute-resources")
    val fqn = s"$t/$ns"
    page.getByTestId("resource-group-type-select").selectOption(new SelectOption().setLabel("Specified for this namespace"))
    page.getByTestId("resource-group-select").selectOption(new SelectOption().setLabel(rg))
    saveButton.click()
    eventually() {
      assert(admin.namespaces().getNamespaceResourceGroup(fqn) == rg,
        s"resource group was: ${admin.namespaces().getNamespaceResourceGroup(fqn)}")
    }
  }

  test("NS-21: Messaging tab persists max-unacked-messages-per-consumer") {
    val (t, ns) = openDetails("messaging")
    val fqn = s"$t/$ns"
    page.getByTestId("max-unacked-consumer-type-select").selectOption(new SelectOption().setLabel("Specified for this namespace"))
    page.getByTestId("max-unacked-consumer-value-input").fill("42")
    saveButton.click()
    eventually() {
      val v = admin.namespaces().getMaxUnackedMessagesPerConsumer(fqn)
      assert(v != null && v.intValue == 42, s"maxUnacked was: $v")
    }
  }

  test("NS-22: Persistence tab persists bookkeeper ensemble/quorums") {
    val (t, ns) = openDetails("persistence")
    val fqn = s"$t/$ns"
    page.getByTestId("persistence-type-select").selectOption(new SelectOption().setLabel("Specified for this namespace"))
    // Fill ensemble ≥ write-quorum ≥ ack-quorum in order so the client-side check stays valid throughout.
    page.getByTestId("persistence-ensemble-input").fill("2")
    page.getByTestId("persistence-write-quorum-input").fill("2")
    page.getByTestId("persistence-ack-quorum-input").fill("1")
    saveButton.click()
    eventually() {
      val p = admin.namespaces().getPersistence(fqn)
      assert(p != null && p.getBookkeeperEnsemble == 2 && p.getBookkeeperWriteQuorum == 2 && p.getBookkeeperAckQuorum == 1,
        s"persistence was: $p")
    }
  }

  test("NS-23: Topic Compaction (namespace) persists a compaction threshold") {
    val (t, ns) = openDetails("topic-compaction")
    val fqn = s"$t/$ns"
    page.getByTestId("compaction-threshold-type-select").selectOption(new SelectOption().setLabel("Specified for this namespace"))
    // The seed (1024B) renders as "1 KB"; fill a NON-default "3" → 3 KB = 3072 bytes, proving the
    // value input's wiring rather than the select's hardcoded seed.
    page.getByTestId("compaction-threshold-value-input").fill("3")
    saveButton.click()
    eventually() {
      assert(admin.namespaces().getCompactionThreshold(fqn) == 3072L,
        s"compaction threshold was: ${admin.namespaces().getCompactionThreshold(fqn)}")
    }
  }
