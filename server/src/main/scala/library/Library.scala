package library

import consumer.{
    given_Decoder_ConsumerSessionConfig,
    given_Encoder_ConsumerSessionConfig,
    given_Decoder_MessageFilter,
    given_Encoder_MessageFilter,
    given_Decoder_MessageFilterChain,
    given_Encoder_MessageFilterChain,
    ConsumerSessionConfig,
    MessageFilter,
    MessageFilterChain
}
import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson

enum LibraryItemType:
    case ConsumerSessionConfig
    case ProducerSessionConfig
    case MarkdownDocument
    case MessageFilter
    case MessageFilterChain
    case DataVisualizationWidget
    case DataVisualizationDashboard
given Decoder[LibraryItemType] = deriveDecoder[LibraryItemType]
given Encoder[LibraryItemType] = deriveEncoder[LibraryItemType]

case class LibraryItemDescriptor(
    `type`: LibraryItemType,
    value: ConsumerSessionConfig | MessageFilter | MessageFilterChain
)
given Decoder[LibraryItemDescriptor] = new Decoder[LibraryItemDescriptor] {
    final def apply(c: HCursor): Decoder.Result[LibraryItemDescriptor] =
        for {
            itemType <- c.downField("type").as[LibraryItemType]
            value <- itemType match {
                case LibraryItemType.ConsumerSessionConfig => c.downField("value").as[ConsumerSessionConfig]
                case LibraryItemType.MessageFilter         => c.downField("value").as[MessageFilter]
                case LibraryItemType.MessageFilterChain    => c.downField("value").as[MessageFilterChain]
            }
        } yield LibraryItemDescriptor(itemType, value)
}

given Encoder[LibraryItemDescriptor] = new Encoder[LibraryItemDescriptor] {
    final def apply(a: LibraryItemDescriptor): Json = Json.obj(
        ("type", a.`type`.asJson),
        (
            "value",
            a.value match {
                case v: ConsumerSessionConfig => v.asJson
                case v: MessageFilter         => v.asJson
                case v: MessageFilterChain    => v.asJson
            }
        )
    )
}

case class LibraryItem(
    id: String,
    revision: String,
    updatedAt: Long,
    isEditable: Boolean,
    name: String,
    descriptionMarkdown: String,
    tags: List[String],
    resources: List[ResourceMatcher],
    descriptor: LibraryItemDescriptor
)
given Decoder[LibraryItem] = deriveDecoder[LibraryItem]
given Encoder[LibraryItem] = deriveEncoder[LibraryItem]

type LibraryItemId = String
type FileName = String
type TagName = String
type LibraryScanResultEntry = Either[Throwable, LibraryItem]
type LibraryScanResults = Map[FileName, LibraryScanResultEntry]

case class ListItemsFilter(
    types: List[LibraryItemType],
    tags: List[TagName],
    resourceFqns: List[String],
    name: String,
    description: String
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
    private var rootDir = "./library"
    private var db = LibraryDb(itemsById = Map.empty)

    def writeItem(item: LibraryItem): Unit =
        val fileName = s"${item.id}.json"
        val filePath = os.Path(fileName, os.Path(rootDir))
        val itemAsJson = item.asJson.spaces2SortKeys

        os.write.over(
            target = os.Path(filePath, os.pwd),
            data = itemAsJson
        )

        refreshDb()

    def deleteItem(itemId: LibraryItemId): Unit =
        val fileName = s"$itemId.json"
        val filePath = os.Path(fileName, os.Path(rootDir))

        os.remove(filePath)

        refreshDb()

    def getItemById(itemId: LibraryItemId): Option[LibraryItem] =
        db.itemsById.get(itemId)

    def listItems(filter: ListItemsFilter): List[LibraryItem] =
        def getItemsByTags(items: List[LibraryItem], tags: List[TagName]): List[LibraryItem] =
            items.filter(item => item.tags.exists(tag => tags.contains(tag)))

        def getItemsByResourceFqns(items: List[LibraryItem], fqns: List[String]): List[LibraryItem] =
            items.filter(item => item.resources.exists(resource => fqns.exists(fqn => ResourceMatcher.test(resource, fqn)))).toList

        def getItemsByName(items: List[LibraryItem], name: String): List[LibraryItem] =
            val subStringLowerCased = name.toLowerCase
            items.filter(item => item.name.toLowerCase.contains(subStringLowerCased))

        def getItemsByDescription(items: List[LibraryItem], description: String): List[LibraryItem] =
            val subStringLowerCased = description.toLowerCase
            items.filter(item => item.descriptionMarkdown.toLowerCase.contains(subStringLowerCased))

        val dbItems = db.itemsById.values.toList
        val byTypes =
            if filter.types.isEmpty
            then dbItems
            else dbItems.filter(item => filter.types.contains(item.descriptor.`type`))
        val byResourceFqns =
            if filter.resourceFqns.isEmpty
            then byTypes
            else getItemsByResourceFqns(byTypes, filter.resourceFqns)
        val byName =
            if filter.name.isEmpty
            then byResourceFqns
            else getItemsByName(byResourceFqns, filter.name)
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
                        if item.id != libraryItemIdFromFileName then
                            fileName -> Left(
                                new Exception(
                                    s"File name $fileName does not match library item id ${item.id}"
                                )
                            )
                        else fileName -> scanResultEntry
            }
            .toMap

    private def refreshDb(): Unit =
        val scanResult = scan()
        val itemsById = scanResult.collect { case (_, Right(item)) => item.id -> item }
        db = LibraryDb(itemsById = itemsById)
