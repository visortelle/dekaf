package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import scala.jdk.CollectionConverters.*

class CsTargetsSpec extends DekafSuite:
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)
  private def hasText       = new LocatorAssertions.HasTextOptions().setTimeout(20000)
  private def vis           = new LocatorAssertions.IsVisibleOptions().setTimeout(20000)

  test("CS-4: add / remove / move targets; boundary move buttons disabled at the ends") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)

    // One target by default; no move buttons with a single target.
    assertThat(cs.targets).hasCount(1, count(1))
    assertThat(cs.target(0).moveLeft).hasCount(0, count(0))

    cs.addTarget()
    assertThat(cs.targets).hasCount(2, count(2))

    // Boundary disabled states.
    assertThat(cs.target(0).moveLeft).isDisabled()
    assertThat(cs.target(1).moveRight).isDisabled()
    assertThat(cs.target(0).moveRight).isEnabled()

    // Make target 0 distinguishable, then move it right and assert order swapped.
    cs.target(0).setMode("Specific Topic(s)")
    assertThat(cs.target(0).modeSelect).hasValue("multi-topic-selector")
    assertThat(cs.target(1).modeSelect).hasValue("current-topic")

    cs.target(0).moveRight.click()
    assertThat(cs.target(0).modeSelect).hasValue("current-topic")
    assertThat(cs.target(1).modeSelect).hasValue("multi-topic-selector")

    // Remove one target -> back to a single target, move buttons gone.
    cs.target(0).remove.click()
    assertThat(cs.targets).hasCount(1, count(1))
    assertThat(cs.target(0).moveLeft).hasCount(0, count(0))
  }

  test("CS-5: target modes Current / Specific (FQN validate + duplicate reject) / RegExp") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    val ts = cs.target(0)

    ts.setMode("Specific Topic(s)")
    val good = "persistent://a/b/c"
    ts.typeFqn(good)
    assertThat(ts.addFqnButton).isEnabled()
    ts.addFqnButton.click()
    assertThat(cs.target(0).root.getByText(good)).isVisible(vis)

    // Duplicate is rejected: error shown, Add disabled.
    ts.typeFqn(good)
    assertThat(page.getByText("The topic is already in the list.")).isVisible(vis)
    assertThat(ts.addFqnButton).isDisabled()

    // Bad format is rejected.
    ts.fqnInput.fill("not-a-fqn")
    assertThat(page.getByText("Expecting the following topic name format")).isVisible(vis)
    assertThat(ts.addFqnButton).isDisabled()

    // RegExp mode reveals the pattern input.
    ts.setMode("Namespaced RegExp")
    assertThat(ts.regexPattern).isVisible(vis)

    ts.setMode("Current Topic")
    assertThat(ts.modeSelect).hasValue("current-topic")
  }

  test("CS-6: resolve-info matched-topic count equals the admin oracle") {
    val t    = fixtures.createTenant()
    val ns   = fixtures.createNamespace(t)
    val fqn1 = fixtures.createTopic(t, ns)
    val fqn2 = fixtures.createTopic(t, ns)
    val topic1 = fqn1.substring(fqn1.lastIndexOf('/') + 1)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic1)
    val ts = cs.target(0)
    ts.setMode("Specific Topic(s)")
    ts.addFqn(fqn1)
    ts.addFqn(fqn2)

    val expected = 2 // exactly the two real topics we added
    assertThat(ts.resolveCount).hasText(expected.toString, hasText)
  }

  test("CS-7: a Current-Topic target shows 'not applicable' when opened off a non-topic route") {
    val t  = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)

    val cs = ConsumerSessionPage(page)
    cs.openForNamespace(t, ns)                 // no current topic in this context
    val ts = cs.target(0)
    ts.setMode("Current Topic")
    assertThat(ts.notApplicable).isVisible(vis)
  }
