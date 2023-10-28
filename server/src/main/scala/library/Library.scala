package library

import scalapb.json4s.JsonFormat
import com.typesafe.scalalogging.Logger
import com.tools.teal.pulsar.ui.library.v1.library as pb
import scala.util.{Failure, Success, Try}

case class LibraryItemMetadata(
    updatedAt: String,
    tags: List[String],
    availableForContexts: List[ResourceMatcher]
)

case class LibraryItem(
    metadata: LibraryItemMetadata,
    spec: UserManagedItem
)

object LibraryItem:
    def toJson(item: LibraryItem): String =
        val itemPb = libraryItemToPb(item)
        JsonFormat.toJsonString[pb.LibraryItem](itemPb)
    def fromJson(json: String): LibraryItem = libraryItemFromPb(JsonFormat.fromJsonString[pb.LibraryItem](json))

type LibraryItemId = String
type FileName = String
type TagName = String
type LibraryScanResultEntry = Either[Throwable, LibraryItem]
type LibraryScanResults = Map[FileName, LibraryScanResultEntry]

case class ListItemsFilter(
    types: List[UserManagedItemType],
    tags: List[TagName],
    contextFqns: List[String]
)

case class LibraryDb(
    itemsById: Map[LibraryItemId, LibraryItem]
)

object Library:
    def createAndRefreshDb(rootDir: String): Library =
        val library = Library()
        library.rootDir = rootDir
        library.refreshDb()
        library

class Library:
    private var rootDir = "./data"
    private var db = LibraryDb(itemsById = Map.empty)
    private val logger: Logger = Logger(getClass.getName)

    def writeItem(item: LibraryItem): Unit =
        val itemId = item.spec.metadata.id

        if item.spec.metadata.name.isEmpty then throw new Exception(s"Library item $itemId should have a name.")

        val fileName = s"$itemId.json"
        val filePath = os.Path(fileName, os.Path(rootDir, os.pwd))
        val itemAsJson: String = LibraryItem.toJson(item)

        os.write.over(
            target = filePath,
            data = itemAsJson
        )

        refreshDb()

    def deleteItem(itemId: LibraryItemId): Unit =
        val fileName = s"$itemId.json"
        val filePath = os.Path(fileName, os.Path(rootDir, os.pwd))

        os.remove(filePath)

        refreshDb()

    def getItemById(itemId: LibraryItemId): Option[LibraryItem] =
        db.itemsById.get(itemId)

    def listItems(filter: ListItemsFilter): List[LibraryItem] =
        def getItemsByTags(items: List[LibraryItem], tags: List[TagName]): List[LibraryItem] =
            items.filter(item => item.metadata.tags.exists(tag => tags.contains(tag)))

        def getItemsByContextFqns(items: List[LibraryItem], contextFqns: List[String]): List[LibraryItem] =
            items.filter(item => item.metadata.availableForContexts.exists(resource => contextFqns.exists(fqn => ResourceMatcher.test(resource, fqn))))

        val dbItems = db.itemsById.values.toList
        val byTypes =
            if filter.types.isEmpty
            then dbItems
            else
                dbItems.filter(item =>
                    val metadata = item.spec.metadata
                    filter.types.contains(metadata.`type`)
                )
        val byContextFqns =
            if filter.contextFqns.isEmpty
            then byTypes
            else getItemsByContextFqns(byTypes, filter.contextFqns)
        val byTags =
            if filter.tags.isEmpty
            then byContextFqns
            else getItemsByTags(byContextFqns, filter.tags)

        byTags

    private def scan(): LibraryScanResults =
        os.list(os.Path(rootDir, os.pwd))
            .filter(f => os.isFile(f) && f.ext == "json")
            .map { path =>
                val fileName = path.last
                val fileContent = os.read(path)
                val scanResultEntry = Try(LibraryItem.fromJson(fileContent)).toEither

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
