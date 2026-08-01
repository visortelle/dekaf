package library

import zio.*
import zio.test.*

import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.library.v1.library.{DeleteLibraryItemRequest, GetLibraryItemRequest}
import _root_.library.managed_items.{ManagedMarkdownDocument, ManagedMarkdownDocumentSpec}

import scala.concurrent.duration.{Duration, SECONDS}
import scala.concurrent.{Await, Future}

/** `LibraryServiceImpl.deleteLibraryItem` - the gRPC STATUS the UI is handed, not the store beneath
  * it.
  *
  * `libraryScanTest` pins `Library.deleteItem`: it throws `NoSuchElementException` for an id with no
  * file and `IllegalArgumentException` for an id outside the safe charset. Nothing pinned what the
  * service does with those two exceptions, and they leave by different `catch` arms of the same
  * `try`. Adding a `case e: Exception` arm above them, or reordering them, silently collapses both
  * into INTERNAL - the store stays correct while every caller starts seeing a server error, and no
  * test notices. `getLibraryItem` already answers NOT_FOUND for a missing id, so a delete that
  * answered INTERNAL (or, before 2026-07-25, OK) for the same id also makes the API inconsistent
  * with itself.
  *
  * Each test mints its own `os.temp.dir` and its own service, so parallel execution is safe.
  */
object libraryServiceDeleteTest extends ZIOSpecDefault:

    private def markdownItem(id: String): LibraryItem =
        LibraryItem(
            metadata = LibraryItemMetadata(
                updatedAt = "2026-07-26T00:00:00Z",
                availableForContexts = Vector(ResourceMatcher(matcher = TenantMatcher(matcher = ExactTenantMatcher(tenant = "t1"))))
            ),
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

    /** A service over a throwaway library directory. The process-wide `libraryRoot` is fixed for the
      * JVM, so the store is passed in - the same device `PulsarAuthRoutes.routesWith` uses. */
    private def serviceOver(root: os.Path): LibraryServiceImpl =
        LibraryServiceImpl(Library.createAndRefreshDb(root.toString))

    private def await[A](future: Future[A]): A = Await.result(future, Duration(30, SECONDS))

    def spec = suite(this.getClass.toString)(
        test("deleting an id that has no file answers NOT_FOUND, not OK and not INTERNAL") {
            // REGRESSION - `Library.deleteItem` used `os.remove`, i.e. `Files.deleteIfExists`, which
            // returns false rather than throwing, so deleting an id that never existed reported
            // Code.OK: the UI showed a "deleted" confirmation for something it had not deleted.
            val root = os.temp.dir(prefix = "library-service-delete")
            val service = serviceOver(root)
            await(service.saveLibraryItem(pbSave(markdownItem("present1"))))

            val missing = await(service.deleteLibraryItem(DeleteLibraryItemRequest(id = "missing1")))
            val present = await(service.getLibraryItem(GetLibraryItemRequest(id = "present1")))

            assertTrue(
                missing.getStatus.code == Code.NOT_FOUND.value,
                // ... and it is the SAME verdict its sibling read gives for the same id
                await(service.getLibraryItem(GetLibraryItemRequest(id = "missing1"))).getStatus.code == Code.NOT_FOUND.value,
                // nothing collateral happened
                present.getStatus.code == Code.OK.value,
                os.exists(root / "present1.binpb")
            ) ?? s"missing=${missing.getStatus} present=${present.getStatus}"
        },
        test("deleting a malformed id answers INVALID_ARGUMENT, which is not the missing-item verdict") {
            // Item ids become file names, so ids outside the safe charset are refused before any
            // filesystem call - a caller error, distinct from "there is no such item". Collapsing
            // the two would tell the UI to retry a path-traversal attempt as if it were a typo.
            val root = os.temp.dir(prefix = "library-service-delete")
            val service = serviceOver(root)

            val traversal = await(service.deleteLibraryItem(DeleteLibraryItemRequest(id = "../../evil")))
            val badCharset = await(service.deleteLibraryItem(DeleteLibraryItemRequest(id = "bad+id")))

            assertTrue(
                traversal.getStatus.code == Code.INVALID_ARGUMENT.value,
                badCharset.getStatus.code == Code.INVALID_ARGUMENT.value,
                // nothing escaped the library root
                !os.exists(root / os.up / "evil.binpb"),
                !os.exists(root / os.up / os.up / "evil.binpb")
            ) ?? s"traversal=${traversal.getStatus} badCharset=${badCharset.getStatus}"
        },
        test("deleting a real item answers OK and the item is gone from disk and from reads") {
            // The control: the two refusals above prove nothing unless a genuine delete still works,
            // and OK has to mean the file is actually gone - not merely that no exception escaped.
            val root = os.temp.dir(prefix = "library-service-delete")
            val service = serviceOver(root)
            await(service.saveLibraryItem(pbSave(markdownItem("dropme"))))
            await(service.saveLibraryItem(pbSave(markdownItem("keepme"))))

            val readBefore = await(service.getLibraryItem(GetLibraryItemRequest(id = "dropme")))
            val deleted = await(service.deleteLibraryItem(DeleteLibraryItemRequest(id = "dropme")))
            val readAfter = await(service.getLibraryItem(GetLibraryItemRequest(id = "dropme")))
            val deletedAgain = await(service.deleteLibraryItem(DeleteLibraryItemRequest(id = "dropme")))

            assertTrue(
                readBefore.getStatus.code == Code.OK.value,
                deleted.getStatus.code == Code.OK.value,
                !os.exists(root / "dropme.binpb"),
                readAfter.getStatus.code == Code.NOT_FOUND.value,
                // a repeated delete is now a miss, not a second success
                deletedAgain.getStatus.code == Code.NOT_FOUND.value,
                // the delete is surgical
                await(service.getLibraryItem(GetLibraryItemRequest(id = "keepme"))).getStatus.code == Code.OK.value,
                os.exists(root / "keepme.binpb")
            ) ?? s"deleted=${deleted.getStatus} readAfter=${readAfter.getStatus} deletedAgain=${deletedAgain.getStatus}"
        }
    )

    private def pbSave(item: LibraryItem) =
        com.tools.teal.pulsar.ui.library.v1.library.SaveLibraryItemRequest(item = Some(LibraryItem.toPb(item)))
