package configuration

import harness.{DekafInstance, DekafSuite}
import com.microsoft.playwright.Page
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

import scala.jdk.CollectionConverters.*

/** CFG-ID - `pulsarName` and `pulsarColor`: the two settings whose entire purpose is to be SEEN, so
  * that an operator with a staging and a production Dekaf open side by side can tell which window
  * is which. Both travel the same path (config -> the Freemarker `index.ftl` model -> the app's
  * bootstrap config object -> React), and neither has any other effect, so if they do not render
  * they do nothing at all.
  *
  * One property per test, each on an instance that overrides only that property, so a failure names
  * one setting.
  */
class CfgInstanceIdentitySpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  // The tree node exists before its label does, so `isVisible` is not the readiness this needs and
  // the assertion default (5s) is too short for a cold instance.
  private def text(ms: Int) = new LocatorAssertions.ContainsTextOptions().setTimeout(ms.toDouble)

  test("CFG-ID-1: the configured pulsarName is rendered in the navigation tree and on the instance overview") {
    // Unique, so no default, placeholder or leftover string can accidentally satisfy the assertion.
    val instanceName = fixtures.unique("cfg-instance")
    DekafInstance.withInstance("pulsar-name", "DEKAF_PULSAR_NAME" -> instanceName) { instance =>
      page.navigate(instance.url("/overview"))

      // The root node of the navigation tree - present on every page, and the app's own fallback
      // when the name is unset is the literal "Pulsar Instance", which this cannot match.
      val root = page.locator("[data-testid=nav-tree-node][data-node-type=instance]")
      assertThat(root).isVisible(vis(30000))
      assertThat(root).containsText(instanceName, text(30000))

      // ... and the "Instance Name" row of the instance overview.
      val row = page.locator("tr", new Page.LocatorOptions().setHasText("Instance Name"))
      assertThat(row).containsText(instanceName, text(30000))
    }
  }

  test("CFG-ID-2: the configured pulsarColor reaches the DOM as the accent border") {
    // A colour with no chance of being a default anywhere in the stylesheet.
    DekafInstance.withInstance("pulsar-color", "DEKAF_PULSAR_COLOR" -> "#ff0099") { instance =>
      page.navigate(instance.url("/overview"))
      assertThat(page.locator("[data-testid=nav-tree-node][data-node-type=instance]")).isVisible(vis(30000))

      // The accent is a portal appended to <body> whose inline style is built from the config value;
      // it carries no testId, so it is selected by that inline style and asserted on the COMPUTED
      // one - which is what the browser really paints, and what normalises the hex to rgb().
      val painted = page.evaluate(
        """() => Array.from(document.body.children)
          |     .filter(el => el.style && el.style.boxShadow)
          |     .map(el => getComputedStyle(el).boxShadow)""".stripMargin
      ).asInstanceOf[java.util.List[String]].asScala.toList

      assert(painted.size == 1, s"expected exactly one accent element under <body>, got: $painted")
      val boxShadow = painted.head
      assert(boxShadow.contains("rgb(255, 0, 153)"), s"the accent is not the configured colour: '$boxShadow'")
      assert(boxShadow.contains("inset"), s"the accent is not drawn inset: '$boxShadow'")
      assert(boxShadow.contains("2px"), s"the accent has no width: '$boxShadow'")
    }
  }
