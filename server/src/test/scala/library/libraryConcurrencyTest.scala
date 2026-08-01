package library

import zio.*
import zio.test.*
import _root_.library.managed_items.{ManagedMarkdownDocument, ManagedMarkdownDocumentSpec}

/** Concurrency contracts for `library/Library.scala`.
  *
  * `Library` is a per-instance singleton shared by every gRPC call (`LibraryServiceImpl.library`), so
  * saveLibraryItem/deleteLibraryItem run concurrently on ONE object. Both mutators are
  * "touch a file, then rescan the whole dir, then replace `db`":
  *
  *   - two racing writers can interleave so an OLDER scan publishes LAST, dropping a just-written
  *     item from the snapshot even though its file is on disk (get/list stop seeing it until the
  *     next unrelated mutation);
  *   - deleteItem does exists-then-remove, so two racing deletes of the same id can both pass the
  *     exists check and both report OK.
  *
  * These tests race real threads (`ZIO.attemptBlocking` on the blocking pool) rather than asserting
  * on structure, and repeat under `TestAspect.nonFlaky` because a single round can get lucky.
  * Each test mints its own temp dir and its own Library, so parallel execution is safe.
  */
object libraryConcurrencyTest extends ZIOSpecDefault {

    private def tempDir(): os.Path =
        os.temp.dir(prefix = "library-concurrency")

    private def tenantContext(tenant: String): ResourceMatcher =
        ResourceMatcher(matcher = TenantMatcher(matcher = ExactTenantMatcher(tenant = tenant)))

    private def markdownItem(id: String): LibraryItem =
        LibraryItem(
            metadata = LibraryItemMetadata(updatedAt = "2026-07-25T00:00:00Z", availableForContexts = Vector(tenantContext("t1"))),
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

    def spec = suite(this.getClass.toString)(
        test("concurrent writes of distinct ids all survive in the in-memory snapshot") {
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            val ids = (0 until 12).map(i => f"item$i%02d").toVector

            for _ <- ZIO.foreachParDiscard(ids)(id => ZIO.attemptBlocking(library.writeItem(markdownItem(id))))
            yield
                val missingOnDisk = ids.filterNot(id => os.exists(root / s"$id.binpb"))
                val missingInDb = ids.filterNot(id => library.getItemById(id).isDefined)
                assertTrue(missingOnDisk.isEmpty, missingInDb.isEmpty, library.size == ids.size) ??
                    s"written to disk but lost from the snapshot: ${missingInDb.mkString(", ")}"
        } @@ TestAspect.nonFlaky(25),
        test("a concurrent write is not dropped by a concurrent delete's rescan") {
            // The same lost-update, mixed: the deleter's scan may predate the writer's file.
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            library.writeItem(markdownItem("victim"))

            for _ <- ZIO.collectAllParDiscard(Seq(
                    ZIO.attemptBlocking(library.writeItem(markdownItem("newone"))),
                    ZIO.attemptBlocking(library.deleteItem("victim"))
                ))
            yield assertTrue(
                library.getItemById("newone").isDefined,
                library.getItemById("victim").isEmpty,
                os.exists(root / "newone.binpb"),
                library.size == 1
            )
        } @@ TestAspect.nonFlaky(25),
        test("exactly one of several concurrent deletes of the same id succeeds") {
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            library.writeItem(markdownItem("dupdel"))

            for results <- ZIO.foreachPar(1 to 4)(_ => ZIO.attemptBlocking(library.deleteItem("dupdel")).either)
            yield assertTrue(
                results.count(_.isRight) == 1,
                results.count(_.isLeft) == 3,
                !os.exists(root / "dupdel.binpb"),
                library.size == 0
            ) ?? s"delete attempts that reported success: ${results.count(_.isRight)} (expected exactly 1)"
        } @@ TestAspect.nonFlaky(25)
    )
}
