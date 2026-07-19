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

class Library:
    private var rootDir = "./data"
    private var db = LibraryDb(itemsById = Map.empty)
    private val logger: Logger = Logger(getClass.getName)

    def size: Int = db.itemsById.size

    private def requireSafeItemId(itemId: LibraryItemId): Unit =
        if Library.SafeItemId.findFirstIn(itemId).isEmpty then
            throw new IllegalArgumentException(
                s"Invalid library item id - only alphanumerics, '_' and '-' are allowed."
            )

    def writeItem(item: LibraryItem): Unit =
        val itemId = item.spec.metadata.id
        requireSafeItemId(itemId)

        if item.spec.metadata.name.isEmpty then throw new Exception(s"Library item $itemId should have a name.")
        // An item with no contexts can never be returned by any search - reject instead of orphaning.
        if item.metadata.availableForContexts.isEmpty then
            throw new IllegalArgumentException(
                s"Library item $itemId must be available in at least one context; an item without contexts would be unreachable."
            )

        val fileName = s"$itemId.binpb"
        val filePath = os.Path(fileName, os.Path(rootDir, os.pwd))
        val itemAsBinary = LibraryItem.toPb(item).toByteArray

        os.write.over(
            target = filePath,
            data = itemAsBinary
        )

        refreshDb()

    def deleteItem(itemId: LibraryItemId): Unit =
        requireSafeItemId(itemId)
        val fileName = s"$itemId.binpb"
        val filePath = os.Path(fileName, os.Path(rootDir, os.pwd))

        os.remove(filePath)

        refreshDb()

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

                val libraryItemIdFromFileName = fileName.split('.').head
                scanResultEntry match
                    case Left(err) =>
                        logger.warn(s"Failed to parse library item from file $fileName: $err")
                        fileName -> scanResultEntry
                    case Right(item) =>
                        val itemId = item.spec.metadata.id
                        if itemId != libraryItemIdFromFileName then
                            fileName -> Left(
                                new Exception(
                                    s"File name $fileName does not match library item id $itemId"
                                )
                            )
                        else fileName -> scanResultEntry
            }
            .toMap

    private def refreshDb(): Unit =
        val scanResult = scan()
        val itemsById = scanResult.collect { case (_, Right(item)) =>
            val itemId = item.spec.metadata.id
            itemId -> item
        }
        logger.info(s"Library refreshed. Found ${itemsById.size} items in library")

        db = LibraryDb(itemsById = itemsById)
