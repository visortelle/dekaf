package configuration

import features.library.LibrarySidebar
import harness.{DekafInstance, DekafSuite}
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

import java.nio.file.{Files, Path}
import scala.jdk.CollectionConverters.*
import scala.util.Using

/** CFG-DD - `dataDir`, the one place Dekaf keeps user state. There is no database: the Library
  * writes managed items under `dataDir/library`, so this setting is the whole isolation boundary
  * between two Dekafs on one host. The desktop app relies on it (a data dir per saved connection),
  * and the e2e stack scripts rely on it (`DEKAF_FRESH_DATA=1`).
  *
  * Isolation is asserted in BOTH directions on purpose. "A second instance cannot see the item" is
  * satisfied just as well by a query that can never find anything, so the same assertion is run
  * against a third instance started on the FIRST data dir, where it must find it.
  */
class CfgDataDirSpec extends DekafSuite:
  private def cnt(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)
  private def text(ms: Int) = new LocatorAssertions.ContainsTextOptions().setTimeout(ms.toDouble)

  private val itemType = "message-filter"

  /** Open the topic overview on `instance` and read the Library's count for `itemType`, waiting for
    * the count to have genuinely LOADED (the UI collapses an unresolved count to 0). */
  private def libraryCount(url: String): LibrarySidebar =
    page.navigate(url)
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.openAllItemsSubtab()
    lib.awaitTypeLoaded(itemType, 30000)
    lib

  test("CFG-DD-1: a Library item saved under one dataDir is absent from an instance on another, and present on the same one") {
    val tenant = fixtures.createTenant()
    val namespace = fixtures.createNamespace(tenant)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$tenant/$namespace/$topic")
    val topicPath = s"/tenants/$tenant/namespaces/$namespace/topics/persistent/$topic/overview"
    val itemName = fixtures.unique("cfg-dd-item").replaceAll("[^A-Za-z0-9_-]", "-")

    DekafInstance.withDataDir("datadir-a") { dirA =>
      // --- instance A, on dirA: create the item ------------------------------------------------
      DekafInstance.withInstanceOn("datadir-a", dirA) { a =>
        page.navigate(a.url(topicPath))
        val lib = LibrarySidebar(page)
        lib.openLibraryTab()
        lib.createItemNamed(itemType, itemName)

        // It survived a reload, so it came off disk rather than out of the page's own state ...
        assertThat(libraryCount(a.url(topicPath)).typeFound(itemType)).containsText("1", text(20000))

        // ... and the disk it came off is the configured dataDir. This is an oracle INDEPENDENT of
        // the UI that wrote it, which the Library otherwise has none of (README §6).
        // (Items are stored as protobuf, so the bytes are decoded LENIENTLY - Latin-1 never throws -
        // and searched for the name rather than parsed.)
        assert(
          filesUnder(dirA.resolve("library")).exists(f => latin1(f).contains(itemName)),
          s"no file under $dirA/library mentions '$itemName': ${filesUnder(dirA.resolve("library"))}"
        )

        // --- instance B, on a data dir of its own: cannot see it ------------------------------
        DekafInstance.withInstance("datadir-b") { b =>
          assertThat(libraryCount(b.url(topicPath)).typeFound(itemType)).hasCount(0, cnt(20000))
        }
      }

      // --- instance C, a NEW process on dirA: sees it again ------------------------------------
      // Without this, "B cannot see it" would be satisfied by a lookup that never finds anything.
      DekafInstance.withInstanceOn("datadir-a-again", dirA) { c =>
        assertThat(libraryCount(c.url(topicPath)).typeFound(itemType)).containsText("1", text(20000))
      }
    }
  }

  private def filesUnder(dir: Path): List[Path] =
    if !Files.isDirectory(dir) then Nil
    else Using.resource(Files.walk(dir))(_.iterator().asScala.filter(Files.isRegularFile(_)).toList)

  private def latin1(file: Path): String =
    new String(Files.readAllBytes(file), java.nio.charset.StandardCharsets.ISO_8859_1)
