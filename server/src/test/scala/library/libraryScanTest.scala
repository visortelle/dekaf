package library

import zio.test.*
import com.tools.teal.pulsar.ui.library.v1.library as pb
import _root_.library.managed_items.{ManagedMarkdownDocument, ManagedMarkdownDocumentSpec}
import scala.util.Try
import ch.qos.logback.classic.{Level, Logger as LogbackLogger}
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import org.slf4j.LoggerFactory
import scala.jdk.CollectionConverters.*

/** Unit coverage for the on-disk scan/refresh path in `library/Library.scala` - `scan`, `refreshDb`
  * and `deleteItem`. `LibraryBugRegressionsTest` covers the write-side guards (id charset, empty
  * contexts, empty search filter); the read side (what the scanner does with files it did NOT write)
  * was untested.
  *
  * Every test mints its OWN `os.temp.dir` and its own `Library` instance, so the default parallel
  * test execution is safe - there is no shared mutable state and no fixed path.
  */
object libraryScanTest extends ZIOSpecDefault {

    private def tempDir(): os.Path =
        os.temp.dir(prefix = "library-scan")

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

    private def itemBytes(item: LibraryItem): Array[Byte] = LibraryItem.toPb(item).toByteArray

    /** Capture the events emitted on the `library.Library` logger while `body` runs. The appender is
      * attached before the scan and detached after, so it observes the scan's own logging. Other
      * library suites log to the same logger under the default parallel execution, so the assertions
      * below key on a file name UNIQUE to each test rather than on an event count - a foreign warning
      * can never masquerade as the one under test. */
    // SLF4J hands a SubstituteLogger to callers that arrive while the backend is still initializing;
    // under the default parallel suite execution our first `getLogger` can land in that window and a
    // direct cast to the logback Logger throws ClassCastException. Re-fetch until the real logback
    // binding is in place (initialization completes in milliseconds, so this resolves at once).
    private def libraryLogbackLogger(): LogbackLogger =
        var logger = LoggerFactory.getLogger("library.Library")
        var attempts = 0
        while !logger.isInstanceOf[LogbackLogger] && attempts < 500 do
            Thread.sleep(2)
            logger = LoggerFactory.getLogger("library.Library")
            attempts += 1
        logger match
            case l: LogbackLogger => l
            case other           => throw new IllegalStateException(s"Expected a logback logger, got ${other.getClass.getName}")

    private def withCapturedLibraryLogs[A](body: => A): (A, List[ILoggingEvent]) =
        val logbackLogger = libraryLogbackLogger()
        val appender = new ListAppender[ILoggingEvent]()
        appender.start()
        logbackLogger.addAppender(appender)
        try
            val result = body
            (result, appender.list.asScala.toList)
        finally
            logbackLogger.detachAppender(appender)
            appender.stop()

    // Tag byte 0x0f = field 1 with wire type 7, which is not a valid protobuf wire type.
    private val corruptBytes: Array[Byte] = Array[Byte](0x0f, 0x7f, 0x7f, 0x7f)

    def spec = suite(this.getClass.toString)(
        test("a corrupt .binpb file is skipped without failing the scan") {
            val root = tempDir()
            os.write(root / "corrupt1.binpb", corruptBytes)
            os.write(root / "valid1.binpb", itemBytes(markdownItem("valid1")))

            val library = Library.createAndRefreshDb(root.toString)

            assertTrue(
                // the fixture really is unparseable - otherwise this test would prove nothing
                Try(pb.LibraryItem.parseFrom(corruptBytes)).isFailure,
                // the corrupt file neither loads nor takes the whole scan down with it
                library.getItemById("corrupt1").isEmpty,
                library.getItemById("valid1").isDefined,
                library.size == 1,
                // the scanner is read-only: it does not quarantine or delete what it cannot parse
                os.exists(root / "corrupt1.binpb")
            )
        },
        test("a file whose embedded item id does not match its file name is not loaded") {
            val bytes = itemBytes(markdownItem("aaaaaa"))

            val mismatchedRoot = tempDir()
            os.write(mismatchedRoot / "bbbbbb.binpb", bytes)
            val mismatched = Library.createAndRefreshDb(mismatchedRoot.toString)

            // control: the SAME bytes under the matching file name do load, so the rejection above is
            // attributable to the name mismatch and not to bad content.
            val matchingRoot = tempDir()
            os.write(matchingRoot / "aaaaaa.binpb", bytes)
            val matching = Library.createAndRefreshDb(matchingRoot.toString)

            assertTrue(
                mismatched.size == 0,
                mismatched.getItemById("aaaaaa").isEmpty, // not keyed by the embedded id
                mismatched.getItemById("bbbbbb").isEmpty, // nor by the file name
                os.exists(mismatchedRoot / "bbbbbb.binpb"), // left on disk untouched
                matching.size == 1,
                matching.getItemById("aaaaaa").isDefined
            )
        },
        test("non-.binpb entries in the library directory are ignored") {
            val root = tempDir()
            os.write(root / "notes.txt", "not a library item")
            os.write(root / "item.json", """{"metadata":{}}""")
            os.write(root / "README", "no extension at all")
            os.write(root / "valid1.binpb.bak", itemBytes(markdownItem("valid1"))) // real bytes, wrong ext
            os.makeDir(root / "subdir.binpb") // right ext, but a directory - the os.isFile guard
            os.write(root / "valid1.binpb", itemBytes(markdownItem("valid1")))

            val library = Library.createAndRefreshDb(root.toString)

            assertTrue(
                library.size == 1,
                library.getItemById("valid1").isDefined,
                library.getItemById("notes").isEmpty,
                library.getItemById("item").isEmpty,
                // the scan leaves foreign files alone
                os.exists(root / "notes.txt"),
                os.exists(root / "README"),
                os.exists(root / "subdir.binpb")
            )
        },
        test("a file whose name is not exactly `<itemId>.binpb` is not loaded") {
            // The file name is the ONLY handle the API has on an item: writeItem and deleteItem both
            // derive `$itemId.binpb` from the id. The scan derived the id with
            // `fileName.split('.').head`, so `aaaaaa.extra.binpb` was accepted as item `aaaaaa` -
            // listed and gettable, but deleting it targets `aaaaaa.binpb` (NOT_FOUND) and saving it
            // creates a SECOND file. Require the exact canonical name instead.
            val root = tempDir()
            os.write(root / "aaaaaa.extra.binpb", itemBytes(markdownItem("aaaaaa")))
            os.write(root / "bbbbbb.binpb", itemBytes(markdownItem("bbbbbb"))) // control: canonical name

            val library = Library.createAndRefreshDb(root.toString)

            assertTrue(
                library.getItemById("aaaaaa").isEmpty,
                library.size == 1,
                library.getItemById("bbbbbb").isDefined, // the control really does load
                // the scanner stays read-only about what it rejects
                os.exists(root / "aaaaaa.extra.binpb")
            )
        },
        test("a file whose id is outside the safe charset is not loaded") {
            // `requireSafeItemId` guards writeItem/deleteItem but was never applied by the scan, so a
            // file dropped into the library dir with e.g. `bad+id` loaded happily - and then every
            // write/delete for that id was rejected with INVALID_ARGUMENT. An item the API cannot
            // address must not be surfaced.
            val root = tempDir()
            os.write(root / "bad+id.binpb", itemBytes(markdownItem("bad+id")))
            os.write(root / "goodid.binpb", itemBytes(markdownItem("goodid"))) // control

            val library = Library.createAndRefreshDb(root.toString)
            val deleteBad = Try(library.deleteItem("bad+id"))

            assertTrue(
                library.getItemById("bad+id").isEmpty,
                library.size == 1,
                library.getItemById("goodid").isDefined,
                // context: the write path really does refuse this id, which is why surfacing it is wrong
                deleteBad.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                os.exists(root / "bad+id.binpb")
            )
        },
        test("a file rejected for an unsafe id is logged as a warning, not dropped silently") {
            // The rejection branch built a Left(...) that only refreshDb's Right-collector reads -
            // nothing logged it, so an operator saw "Found N items" with no hint a file was skipped.
            val root = tempDir()
            // Names unique to this test so a parallel suite scanning its own unsafe-id file cannot
            // supply the warning we assert on.
            os.write(root / "unsafe+scanlog+id.binpb", itemBytes(markdownItem("unsafe+scanlog+id")))
            os.write(root / "goodscanlogid.binpb", itemBytes(markdownItem("goodscanlogid"))) // control

            val (library, logs) = withCapturedLibraryLogs(Library.createAndRefreshDb(root.toString))
            val warnings = logs.filter(_.getLevel == Level.WARN).map(_.getFormattedMessage)

            assertTrue(
                // still excluded from the db ...
                library.getItemById("unsafe+scanlog+id").isEmpty,
                library.getItemById("goodscanlogid").isDefined,
                // ... but no longer silently: a WARN names the offending file
                warnings.exists(_.contains("unsafe+scanlog+id.binpb"))
            )
        },
        test("a file rejected for a name/id mismatch is logged as a warning, not dropped silently") {
            val root = tempDir()
            os.write(root / "mismatchlogfile.binpb", itemBytes(markdownItem("mismatchlogid")))
            os.write(root / "goodscanlogid2.binpb", itemBytes(markdownItem("goodscanlogid2"))) // control

            val (library, logs) = withCapturedLibraryLogs(Library.createAndRefreshDb(root.toString))
            val warnings = logs.filter(_.getLevel == Level.WARN).map(_.getFormattedMessage)

            assertTrue(
                library.getItemById("mismatchlogid").isEmpty,
                library.getItemById("mismatchlogfile").isEmpty,
                library.getItemById("goodscanlogid2").isDefined,
                warnings.exists(_.contains("mismatchlogfile.binpb"))
            )
        },
        test("every item the scan surfaces is addressable by its id") {
            // The invariant behind the two tests above, stated directly: whatever getItemById returns
            // must be deletable under that same id.
            val root = tempDir()
            os.write(root / "cccccc.extra.binpb", itemBytes(markdownItem("cccccc")))
            os.write(root / "bad+id.binpb", itemBytes(markdownItem("bad+id")))
            os.write(root / "dddddd.binpb", itemBytes(markdownItem("dddddd")))

            val library = Library.createAndRefreshDb(root.toString)
            val surfaced = List("cccccc", "bad+id", "dddddd").filter(library.getItemById(_).isDefined)
            val notDeletable = surfaced.filterNot(id => Try(library.deleteItem(id)).isSuccess)

            assertTrue(surfaced == List("dddddd"), notDeletable.isEmpty)
        },
        test("deleteItem removes the file and drops the item from the db") {
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            library.writeItem(markdownItem("keepme"))
            library.writeItem(markdownItem("dropme"))

            val sizeBefore = library.size
            library.deleteItem("dropme")

            assertTrue(
                sizeBefore == 2,
                !os.exists(root / "dropme.binpb"),
                library.getItemById("dropme").isEmpty,
                // the delete is surgical - the sibling item survives
                os.exists(root / "keepme.binpb"),
                library.getItemById("keepme").isDefined,
                library.size == 1
            )
        },
        test("deleteItem on an unknown id reports not-found instead of succeeding silently") {
            // REGRESSION (fixed 2026-07-25) - Library.scala used to call `os.remove(filePath)` alone, which in os-lib 0.9.3 is
            // `Files.deleteIfExists` (returns false, throws nothing). deleteItem therefore returns
            // normally for an id that never existed, and LibraryServiceImpl.deleteLibraryItem reports
            // Code.OK - indistinguishable from a real delete. Its sibling getLibraryItem already
            // returns NOT_FOUND for the same id, so the API is internally inconsistent and a UI
            // "deleted" confirmation is unearned. Expected: deleteItem signals the miss (and the
            // service maps it to NOT_FOUND); IllegalArgumentException is deliberately NOT the right
            // answer here since that is already the INVALID_ARGUMENT channel for a malformed id.
            val root = tempDir()
            val library = Library.createAndRefreshDb(root.toString)
            library.writeItem(markdownItem("present1"))

            val deleteMissing = Try(library.deleteItem("missing1"))

            assertTrue(
                // context: the id is genuinely absent, and a malformed id DOES still fail loudly
                library.getItemById("missing1").isEmpty,
                Try(library.deleteItem("../../evil")).isFailure,
                // nothing collateral happened - the real item is untouched
                library.getItemById("present1").isDefined,
                library.size == 1,
                deleteMissing.isFailure,
                !deleteMissing.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException])
            )
        }
    )
}
