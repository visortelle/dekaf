package library

import zio.*
import zio.test.*
import zio.test.Assertion.*
import _root_.library.managed_items.{ManagedMarkdownDocument, ManagedMarkdownDocumentSpec}

/** Executable regressions for the formerly-known Library bugs (see e2e/README.md §6), driven at the unit
  * level against a temporary directory - the e2e module cannot reach LibraryService directly.
  *   BUG-17: item ids become file names → charset-guarded against path traversal.
  *   BUG-8:  an item with no contexts would be unreachable → rejected on write.
  *   BUG-9:  an empty search-contexts filter is a caller error → IllegalArgumentException
  *           (mapped to INVALID_ARGUMENT by the service), distinguishable from a no-match.
  * (BUG-16 "per-connection storage scoping" was reclassified as by-design and reverted: a Dekaf
  * instance always serves ONE Pulsar - isolation lives at the deployment layer, e.g. the desktop
  * app gives each saved connection its own DEKAF_DATA_DIR. The library dir stays flat.)
  */
object LibraryBugRegressionsTest extends ZIOSpecDefault {

    private def tempDir(): os.Path =
        os.temp.dir(prefix = "library-bug-regressions")

    private def markdownItem(id: String, contexts: Vector[ResourceMatcher]): LibraryItem =
        LibraryItem(
            metadata = LibraryItemMetadata(updatedAt = "2026-07-19T00:00:00Z", availableForContexts = contexts),
            spec = ManagedMarkdownDocument(
                metadata = ManagedItemMetadata(
                    `type` = ManagedItemType.MarkdownDocument,
                    id = id,
                    name = s"item-$id",
                    descriptionMarkdown = ""
                ),
                spec = ManagedMarkdownDocumentSpec(markdown = "hello")
            )
        )

    private def tenantContext(tenant: String): ResourceMatcher =
        ResourceMatcher(matcher = TenantMatcher(matcher = ExactTenantMatcher(tenant = tenant)))

    def spec = suite(this.getClass.toString)(
        test("BUG-17: a path-traversal item id is rejected on write and delete") {
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            val evil = markdownItem("../../evil", Vector(tenantContext("t1")))
            val write = scala.util.Try(library.writeItem(evil))
            val delete = scala.util.Try(library.deleteItem("../../evil"))
            assertTrue(
                write.isFailure,
                write.failed.get.isInstanceOf[IllegalArgumentException],
                delete.isFailure,
                // nothing escaped the library root - the id has TWO ups, so the true escape
                // target is two levels above the root (also check one level, cheap)
                !os.exists(root / os.up / "evil.binpb"),
                !os.exists(root / os.up / os.up / "evil.binpb")
            )
        },
        test("BUG-8: an item with zero contexts is rejected, not orphaned") {
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            val orphan = markdownItem("a1b2c3", Vector.empty)
            val write = scala.util.Try(library.writeItem(orphan))
            assertTrue(
                write.isFailure,
                write.failed.get.isInstanceOf[IllegalArgumentException],
                library.size == 0
            )
        },
        test("BUG-9: an empty search-contexts filter throws, distinguishable from a no-match") {
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            library.writeItem(markdownItem("abc123", Vector(tenantContext("t1"))))

            val emptyFilter = scala.util.Try(
                library.listItems(ListItemsFilter(types = Vector.empty, contexts = List.empty))
            )
            val noMatch = library.listItems(
                ListItemsFilter(types = Vector.empty, contexts = List(tenantContext("other-tenant")))
            )
            val hit = library.listItems(
                ListItemsFilter(types = Vector.empty, contexts = List(tenantContext("t1")))
            )
            assertTrue(
                emptyFilter.isFailure,
                emptyFilter.failed.get.isInstanceOf[IllegalArgumentException],
                noMatch.isEmpty, // a genuine no-match is an ordinary empty result
                hit.size == 1
            )
        }
    )
}
