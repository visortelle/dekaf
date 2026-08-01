package library

import scalapb.json4s.JsonFormat
import com.typesafe.scalalogging.Logger
import com.tools.teal.pulsar.ui.library.v1.library as pb
import scala.util.{Failure, Success, Try}

type FileName = String
type TagName = String
type LibraryScanResultEntry = Either[Throwable, LibraryItem]
type LibraryScanResults = Map[FileName, LibraryScanResultEntry]

case class ListItemsFilter(
    types: Vector[ManagedItemType],
    contexts: List[ResourceMatcher]
)

case class LibraryDb(
    itemsById: Map[LibraryItemId, LibraryItem]
)

object Library:
    def createAndRefreshDb(rootDir: String): Library =
        os.makeDir.all(os.Path(rootDir, os.pwd)) // scoped per-connection subdirs may not exist yet
        val library = Library()
        library.rootDir = rootDir
        library.refreshDb()
        library

    // Item ids become file names - restrict them to a separator-free charset so a crafted id
    // (e.g. `../../…`) can never escape the library directory. Real ids are UUIDs.
    private val SafeItemId = "^[A-Za-z0-9_-]{1,200}$".r

    private def isSafeItemId(itemId: LibraryItemId): Boolean =
        SafeItemId.findFirstIn(itemId).isDefined

    // The single file name an item may live under. Write, delete and scan must all agree on it.
    private def fileNameOf(itemId: LibraryItemId): FileName = s"$itemId.binpb"

class Library:
    private var rootDir = "./data"
    @volatile private var db = LibraryDb(itemsById = Map.empty)
    private val logger: Logger = Logger(getClass.getName)

    // A Library instance is shared by every gRPC call (LibraryServiceImpl holds exactly one), so
    // saveLibraryItem/deleteLibraryItem run concurrently against it. Each mutation is
    // "touch the file, rescan the dir, publish the snapshot" - three steps that MUST NOT interleave:
    //   - two writers could interleave so that an OLDER scan publishes last, dropping a
    //     just-written item from the snapshot even though its file is on disk;
    //   - a delete racing a scan could remove a file between os.list and os.read.bytes, blowing up
    //     the unrelated writer with NoSuchFileException;
    //   - deleteItem's exists-then-remove could let two concurrent deletes both report success.
    // One lock over the whole sequence makes each mutation atomic with respect to the others.
    private val mutationLock = new Object

    def size: Int = db.itemsById.size

    private def requireSafeItemId(itemId: LibraryItemId): Unit =
        if !Library.isSafeItemId(itemId) then
            throw new IllegalArgumentException(
                s"Invalid library item id - only alphanumerics, '_' and '-' are allowed."
            )

    def writeItem(item: LibraryItem): Unit = mutationLock.synchronized {
        val itemId = item.spec.metadata.id
        requireSafeItemId(itemId)

        if item.spec.metadata.name.isEmpty then throw new Exception(s"Library item $itemId should have a name.")
        // An item with no contexts can never be returned by any search - reject instead of orphaning.
        if item.metadata.availableForContexts.isEmpty then
            throw new IllegalArgumentException(
                s"Library item $itemId must be available in at least one context; an item without contexts would be unreachable."
            )

        val fileName = Library.fileNameOf(itemId)
        val filePath = os.Path(fileName, os.Path(rootDir, os.pwd))
        val itemAsBinary = LibraryItem.toPb(item).toByteArray

        os.write.over(
            target = filePath,
            data = itemAsBinary
        )

        refreshDb()
    }

    def deleteItem(itemId: LibraryItemId): Unit = mutationLock.synchronized {
        requireSafeItemId(itemId)
        val fileName = Library.fileNameOf(itemId)
        val filePath = os.Path(fileName, os.Path(rootDir, os.pwd))

        // os.remove delegates to Files.deleteIfExists, which returns false rather than throwing -
        // so deleting an id that was never there reported OK, indistinguishable from a real delete.
        // Check the FILE, not the cached db: the db is a snapshot and a stale entry would otherwise
        // decide the outcome. NoSuchElementException stays out of the IllegalArgumentException
        // (INVALID_ARGUMENT) channel used for malformed ids; the service maps it to NOT_FOUND.
        // The exists check and the remove are only meaningful together, hence the surrounding lock -
        // unserialized, two concurrent deletes both saw the file and both reported success.
        if !os.exists(filePath) then
            throw new NoSuchElementException(s"No library item with id: $itemId")

        os.remove(filePath)

        refreshDb()
    }

    def getItemById(itemId: LibraryItemId): Option[LibraryItem] =
        db.itemsById.get(itemId)

    def listItems(filter: ListItemsFilter): List[LibraryItem] =
        def getItemsByContexts(items: List[LibraryItem], contexts: List[ResourceMatcher]): List[LibraryItem] =
            items.filter(item =>
                item.metadata.availableForContexts.exists(availableForContext =>
                    contexts.exists(context => availableForContext.test(context))
                )
            )

        // An empty contexts filter used to return an empty list - indistinguishable from a genuine
        // "no matches". It is a caller error and must fail loudly (mapped to INVALID_ARGUMENT).
        if filter.contexts.isEmpty then
            throw new IllegalArgumentException("Search contexts must not be empty.")

        val dbItems = db.itemsById.values.toList
        val byTypes =
            if filter.types.isEmpty
            then dbItems
            else
                dbItems.filter(item =>
                    val metadata = item.spec.metadata
                    filter.types.contains(metadata.`type`)
                )
        getItemsByContexts(byTypes, filter.contexts)

    private def scan(): LibraryScanResults =
        os.list(os.Path(rootDir, os.pwd))
            .filter(f => os.isFile(f) && f.ext == "binpb")
            .map { path =>
                val fileName = path.last
                val fileContent = os.read.bytes(path)
                val scanResultEntryA = Try(LibraryItem.fromPb(pb.LibraryItem.parseFrom(fileContent)))
                val scanResultEntry = scanResultEntryA.toEither

                scanResultEntry match
                    case Left(err) =>
                        logger.warn(s"Failed to parse library item from file $fileName: $err")
                        fileName -> scanResultEntry
                    case Right(item) =>
                        val itemId = item.spec.metadata.id
                        // Whatever the scan surfaces must be ADDRESSABLE: writeItem and deleteItem
                        // both derive `$itemId.binpb` from the id and reject ids outside the safe
                        // charset, so the scan has to hold itself to the same two rules. Deriving
                        // the id with `fileName.split('.').head` instead accepted
                        // `id.extra.binpb` as item `id` - listed and gettable, but deleting it hit
                        // NOT_FOUND and saving it created a SECOND file; and skipping
                        // requireSafeItemId surfaced ids like `bad+id` that every write and delete
                        // then rejected with INVALID_ARGUMENT.
                        if !Library.isSafeItemId(itemId) then
                            logger.warn(s"Skipping library file $fileName: item id $itemId is not a valid item id")
                            fileName -> Left(
                                new Exception(
                                    s"Library item id $itemId in file $fileName is not a valid item id"
                                )
                            )
                        else if fileName != Library.fileNameOf(itemId) then
                            logger.warn(s"Skipping library file $fileName: item id $itemId does not match the file name")
                            fileName -> Left(
                                new Exception(
                                    s"File name $fileName does not match library item id $itemId"
                                )
                            )
                        else fileName -> scanResultEntry
            }
            .toMap

    private def refreshDb(): Unit = mutationLock.synchronized {
        val scanResult = scan()
        val itemsById = scanResult.collect { case (_, Right(item)) =>
            val itemId = item.spec.metadata.id
            itemId -> item
        }
        logger.info(s"Library refreshed. Found ${itemsById.size} items in library")

        db = LibraryDb(itemsById = itemsById)
    }
