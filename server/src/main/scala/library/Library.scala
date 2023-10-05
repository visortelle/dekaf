package library

import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson

case class LibraryItemMetadata(
    updatedAt: String,
    tags: List[String],
    availableForContexts: List[ResourceMatcher]
)

case class LibraryItem(
    metadata: LibraryItemMetadata,
    spec: UserManagedItem
)
given Decoder[LibraryItem] = deriveDecoder[LibraryItem]
given Encoder[LibraryItem] = deriveEncoder[LibraryItem]

type LibraryItemId = String
type FileName = String
type TagName = String
type LibraryScanResultEntry = Either[Throwable, LibraryItem]
type LibraryScanResults = Map[FileName, LibraryScanResultEntry]

case class ListItemsFilter(
    types: List[UserManagedItemType],
    tags: List[TagName],
    name: String,
    description: String,
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

    def writeItem(item: LibraryItem): Unit =
        val itemId = item.spec.metadata.id
        val fileName = s"${itemId}.json"
        val filePath = os.Path(fileName, os.Path(rootDir, os.pwd))
        val itemAsJson = item.asJson.spaces2SortKeys

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

        def getItemsByName(items: List[LibraryItem], name: String): List[LibraryItem] =
            val subStringLowerCased = name.toLowerCase
            items.filter(item =>
                val metadata = item.spec.metadata
                metadata.name.toLowerCase.contains(subStringLowerCased)
            )

        def getItemsByDescription(items: List[LibraryItem], description: String): List[LibraryItem] =
            val subStringLowerCased = description.toLowerCase
            items.filter(item =>
                val metadata = item.spec.metadata
                metadata.descriptionMarkdown.toLowerCase.contains(subStringLowerCased)
            )

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
        val byName =
            if filter.name.isEmpty
            then byContextFqns
            else getItemsByName(byContextFqns, filter.name)
        val byDescription =
            if filter.description.isEmpty
            then byName
            else getItemsByDescription(byName, filter.description)
        val byTags =
            if filter.tags.isEmpty
            then byDescription
            else getItemsByTags(byDescription, filter.tags)

        byTags

    private def scan(): LibraryScanResults =
        os.list(os.Path(rootDir, os.pwd))
            .filter(f => os.isFile(f) && f.ext == "json")
            .map { path =>
                val fileName = path.last
                val fileContent = os.read(path)
                val scanResultEntry = decodeJson[LibraryItem](fileContent)

                val libraryItemIdFromFileName = fileName.split('.').head
                scanResultEntry match
                    case Left(_) =>
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
        db = LibraryDb(itemsById = itemsById)
