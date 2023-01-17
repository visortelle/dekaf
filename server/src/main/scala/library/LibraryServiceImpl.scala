package library

import _root_.client.adminClient
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.tools.teal.pulsar.ui.library.v1.library.{ CreateCollectionRequest, CreateCollectionResponse, CreateLibraryItemRequest, CreateLibraryItemResponse, DeleteCollectionRequest, DeleteCollectionResponse, DeleteLibraryItemRequest, DeleteLibraryItemResponse, LibraryServiceGrpc, ListCollectionsRequest, ListCollectionsResponse, ListLibraryItemsRequest, ListLibraryItemsResponse, NpmPackageRequirement, UpdateCollectionRequest, UpdateCollectionResponse, UpdateLibraryItemRequest, UpdateLibraryItemResponse}
import org.apache.pulsar.client.api.SubscriptionType

import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*
import scala.concurrent.Future
import _root_.config.readConfigAsync
import com.fasterxml.jackson.databind.ObjectMapper

import java.nio.file.{Files, Paths}
import java.io.*
import java.util.UUID
import java.util.stream.Collectors
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.reflect.ClassTag
import scala.reflect.*
import io.circe.{Decoder, Encoder, Json}
import io.circe.parser.*
import io.circe.syntax.*
import io.circe.parser.*
import io.circe.generic.semiauto.*
import io.circe._
import io.circe.generic.semiauto._
import io.circe.syntax._

import cats.syntax.functor._

class LibraryServiceImpl extends LibraryServiceGrpc.LibraryService:

    val library = Await.result(readConfigAsync, Duration(10, SECONDS)).library
    var root = os.root

    case class Collection(id: String, name: String, description: String, collectionItemIds: Array[String])
    given collectionDecoder: Decoder[Collection] = deriveDecoder
    given collectionEncoder: Encoder[Collection] = deriveEncoder

    case class AccessConfigType (
        userReadRoles: Array[String],
        userWriteRoles: Array[String],
        topicPatterns: Array[String],
    )
    given accessConfigEncoder: Encoder[AccessConfigType] = deriveEncoder
    given accessConfigDecoder: Decoder[AccessConfigType] = deriveDecoder

    case class NpmPackage (
        `type`: "npm_package",
        scope: String,
        packageName: String,
        version: String,
    )
    given npmPackageEncoder: Encoder[NpmPackage] = deriveEncoder
    given npmPackageDecoder: Decoder[NpmPackage] = deriveDecoder

    case class AppVersion (
        `type`: "app_version",
        version: String,
    )
    given appVersionEncoder: Encoder[AppVersion] = deriveEncoder
    given appVersionDecoder: Decoder[AppVersion] = deriveDecoder

    type Requirement = NpmPackage | AppVersion

    implicit val requirementEncoder: Encoder[Requirement] = Encoder.instance {
        case v @ NpmPackage(_, _, _, _) => v.asJson
        case v @ AppVersion(_, _) => v.asJson
    }
    implicit val requirementDecoder: Decoder[Requirement] =
        List[Decoder[Requirement]] (
            Decoder[NpmPackage].widen,
            Decoder[AppVersion].widen
        ).reduceLeft(_ or _)

    case class MessageFilter (
        code: String
    )
    given itemMessageFilterEncoder: Encoder[MessageFilter] = deriveEncoder
    given itemMessageFilterDecoder: Decoder[MessageFilter] = deriveDecoder

    case class ProducerConfig ()
    given itemProducerConfigEncoder: Encoder[ProducerConfig] = deriveEncoder
    given itemProducerConfigDecoder: Decoder[ProducerConfig] = deriveDecoder

    case class MessagesVisualizationConfig ()
    given itemMessagesVisualizationConfigEncoder: Encoder[MessagesVisualizationConfig] = deriveEncoder
    given itemMessagesVisualizationConfigDecoder: Decoder[MessagesVisualizationConfig] = deriveDecoder

    case class ConsumerSessionConfig ()
    given itemConsumerSessionConfigEncoder: Encoder[ConsumerSessionConfig] = deriveEncoder
    given itemConsumerSessionConfigDecoder: Decoder[ConsumerSessionConfig] = deriveDecoder


    type LibraryItem = MessageFilter | ConsumerSessionConfig | MessagesVisualizationConfig | ProducerConfig

    implicit val itemDataEncode: Encoder[LibraryItem] = Encoder.instance {
        case v @ MessageFilter(_) => v.asJson
        case v @ ConsumerSessionConfig() => v.asJson
        case v @ MessagesVisualizationConfig () => v.asJson
        case v @ ProducerConfig() => v.asJson
    }
    implicit val itemDataDecoder: Decoder[LibraryItem] =
        List[Decoder[LibraryItem]](
            Decoder[MessageFilter].widen,
            Decoder[ConsumerSessionConfig].widen,
            Decoder[MessagesVisualizationConfig].widen,
            Decoder[ProducerConfig].widen,
        ).reduceLeft(_ or _)

    case class LibraryItemObject(
        id: String,
        name: String,
        description: String,
        schemaVersion: String,
        version: String,
        accessConfig: AccessConfigType,
        requirements: Array[Requirement],
        libraryItem: LibraryItem,
    )
    given libraryItemObjectEncoder: Encoder[LibraryItemObject] = deriveEncoder
    given libraryItemObjectDecoder: Decoder[LibraryItemObject] = deriveDecoder

    override def createCollection(request: CreateCollectionRequest): Future[CreateCollectionResponse] =
        try {
            val collectionId = UUID.randomUUID()

            val json = request.collection match
                case Some(v) =>
                    Collection(
                        collectionId.toString,
                        v.name,
                        v.description,
                        v.collectionItemIds.toArray
                    ).asJson.toString

            os.write(os.pwd/"library"/"collections"/s"${collectionId}.json", json, null, true)

            val status = Status(code = Code.OK.index)
            Future.successful(CreateCollectionResponse(status = Some(status)))

        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateCollectionResponse(status = Some(status)))
        }

    override def listCollections(request: ListCollectionsRequest): Future[ListCollectionsResponse] =

        try {
            val walk = os.walk(os.pwd/"library"/"collections")

            val allCollections: Seq[pb.Collection] = walk.map(path => {
                if (path.toString.endsWith(".json"))
                    decode[Collection](os.read(path)) match
                        case Right(v) =>
                            pb.Collection(
                                v.id,
                                v.name,
                                v.description,
                                v.collectionItemIds.toSeq
                            )
                        case Left(err) => throw new Exception(s"${err}. Unable to parse file at path ${path.toString}")
                else null
            })

            Future.successful(ListCollectionsResponse(
                status = Some(Status(code = Code.OK.index)),
                collections = allCollections
            ))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ListCollectionsResponse(status = Some(status)))
        }

    override def updateCollection(request: UpdateCollectionRequest): Future[UpdateCollectionResponse] =
        try {
            val collectionConfig = request.collection match
                case Some(v) =>
                    Collection(
                        v.id,
                        v.name,
                        v.description,
                        v.collectionItemIds.toArray
                    )

            val json = collectionConfig.asJson.toString
            os.write.over(os.pwd / "library" / "collections" / s"${collectionConfig.id}.json", json)

            val status = Status(code = Code.OK.index)
            Future.successful(UpdateCollectionResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateCollectionResponse(status = Some(status)))
        }

    override def deleteCollection(request: DeleteCollectionRequest): Future[DeleteCollectionResponse] =
        try {
            os.remove(os.pwd / "library" / "collections" / s"${request.id}.json")

            val status = Status(code = Code.OK.index)
            Future.successful(DeleteCollectionResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteCollectionResponse(status = Some(status)))
        }

    def requirementFromPb(requirementPb: pb.Requirement): Requirement = requirementPb.requirement match
        case pb.Requirement.Requirement.NpmPackage(v) =>
            NpmPackage(
                "npm_package",
                v.scope,
                v.packageName,
                v.version,
            )
        case pb.Requirement.Requirement.AppVersion(v) =>
            AppVersion(
                `type` = "app_version",
                version = v.version,
            )

    def accessConfigFromPb(accessConfig: Option[pb.AccessConfig]): AccessConfigType = accessConfig match
        case Some(v) => AccessConfigType(
            v.userReadRoles.toArray,
            v.userWriteRoles.toArray,
            v.topicPatterns.toArray,
        )
        case None => AccessConfigType(Array(), Array(), Array())
    override def createLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] =
        try {
            request.libraryItem match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "err")
                    Future.successful(CreateLibraryItemResponse(status = Some(status)))
                case Some(v) =>
                    val requirements: Array[Requirement] = v.requirements.map(requirementFromPb).toArray

                    val accessConfig = accessConfigFromPb(v.accessConfig)

                    var libraryItemType = "unspecified"

                    val libraryItem: LibraryItem = v.libraryItem match
                        case v: pb.LibraryItem.LibraryItem.MessageFilter =>
                            libraryItemType = "message_filter"
                            MessageFilter(v.value.code)
                        case _: pb.LibraryItem.LibraryItem.ProducerConfig =>
                            libraryItemType = "producer_config"
                            ProducerConfig()
                        case _: pb.LibraryItem.LibraryItem.ConsumerSessionConfig =>
                            libraryItemType = "consumer_session_config"
                            ConsumerSessionConfig()
                        case _: pb.LibraryItem.LibraryItem.MessagesVisualizationConfig =>
                            libraryItemType = "messages_visualization_config"
                            MessagesVisualizationConfig()

                    val libraryItemId = UUID.randomUUID().toString

                    val json = LibraryItemObject(
                        libraryItemId,
                        v.name,
                        v.description,
                        v.schemaVersion,
                        v.version,
                        accessConfig,
                        requirements,
                        libraryItem,
                    ).asJson.toString

                    os.write(os.pwd/"library"/"libraryItems"/s"${libraryItemType}"/s"${libraryItemId}.json", json, null, true)

                    val collectionJson = os.read(os.pwd/"library"/"collections"/s"${request.collectionId}.json")
                    val collection = decode[Collection](collectionJson) match
                        case Right(value) => value

                    val newItemsIds = collection.collectionItemIds :+ libraryItemId

                    val newCollection = Collection(
                        collection.id,
                        collection.name,
                        collection.description,
                        newItemsIds,
                    ).asJson.toString

                    os.write.over(os.pwd /"library"/"collections"/s"${request.collectionId}.json", newCollection)

            val status = Status(code = Code.OK.index)
            Future.successful(CreateLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateLibraryItemResponse(status = Some(status)))
        }

    enum LibraryItemType {
        case message_filter, consumer_session_config, messages_visualization_config, producer_config, unspecified
    }
    def listLibraryItemFromPb(libraryPb: pb.LibraryItemType): LibraryItemType = libraryPb match
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER =>
            LibraryItemType.message_filter
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_CONFIG =>
            LibraryItemType.producer_config
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGES_VISUALIZATION_CONFIG =>
            LibraryItemType.messages_visualization_config
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG =>
            LibraryItemType.consumer_session_config
        case _ => LibraryItemType.unspecified
    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] =
        try {
            def requirementToPb(requirement: Requirement): pb.Requirement = requirement match
                case v: NpmPackage =>
                    val npmPackageRequirementPb = pb.NpmPackageRequirement(v.scope, v.packageName, v.version)
                    pb.Requirement(pb.Requirement.Requirement.NpmPackage(npmPackageRequirementPb))
                case v: AppVersion =>
                    val appVersionPb = pb.AppVersion(version = v.version)
                    pb.Requirement(pb.Requirement.Requirement.AppVersion(appVersionPb))

            val collectionJson = os.read(os.pwd/"library"/"collections"/s"${request.collectionId}.json")
            val collection = decode[Collection](collectionJson) match
                case Right(value) => value

            val libraryItemsList = collection.collectionItemIds.toList.map(collectionItem =>

                val itemJson = os.read(os.pwd/"library"/"libraryItems"/s"${listLibraryItemFromPb(request.itemsType)}"/s"${collectionItem}.json")

                val item = decode[LibraryItemObject](itemJson) match
                    case Right(value) => value

                val accessConfig: pb.AccessConfig = pb.AccessConfig(
                    item.accessConfig.userReadRoles.toSeq,
                    item.accessConfig.userWriteRoles.toSeq,
                    item.accessConfig.topicPatterns.toSeq,
                )

                val requirements: Seq[pb.Requirement] = item.requirements.map(requirementToPb)

                val libraryItem: pb.LibraryItem.LibraryItem = item.libraryItem match
                    case v: MessageFilter => pb.LibraryItem.LibraryItem.MessageFilter(pb.LibraryItemMessageFilter(v.code))
                    case v: ConsumerSessionConfig => pb.LibraryItem.LibraryItem.ConsumerSessionConfig(pb.LibraryItemConsumerSessionConfig())
                    case v: MessagesVisualizationConfig => pb.LibraryItem.LibraryItem.MessagesVisualizationConfig(pb.LibraryItemMessagesVisualizationConfig())
                    case v: ProducerConfig => pb.LibraryItem.LibraryItem.ProducerConfig(pb.LibraryItemProducerConfig())

                pb.LibraryItem(
                    item.id,
                    item.name,
                    item.description,
                    item.schemaVersion,
                    item.version,
                    Option(accessConfig),
                    requirements,
                    libraryItem,
                )
            )

            val status = Status(code = Code.OK.index)
            Future.successful(ListLibraryItemsResponse(
                status = Some(status),
                libraryItems = libraryItemsList
            ))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ListLibraryItemsResponse(status = Some(status)))
        }

    override def updateLibraryItem(request: UpdateLibraryItemRequest): Future[UpdateLibraryItemResponse] =
        try {
            request.libraryItem match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "err")
                    Future.successful(UpdateLibraryItemResponse(status = Some(status)))
                case Some(v) =>
                    val requirements: Array[Requirement] = v.requirements.map(requirementFromPb).toArray

                    val accessConfig = accessConfigFromPb(v.accessConfig)

                    var libraryItemType = "unspecified"
                    val libraryItem: LibraryItem = v.libraryItem match
                        case v: pb.LibraryItem.LibraryItem.MessageFilter =>
                            libraryItemType = "message_filter"
                            MessageFilter(v.value.code)
                        case _: pb.LibraryItem.LibraryItem.ProducerConfig =>
                            libraryItemType = "producer_config"
                            ProducerConfig()
                        case _: pb.LibraryItem.LibraryItem.ConsumerSessionConfig =>
                            libraryItemType = "consumer_session_config"
                            ConsumerSessionConfig()
                        case _: pb.LibraryItem.LibraryItem.MessagesVisualizationConfig =>
                            libraryItemType = "messages_visualization_config"
                            MessagesVisualizationConfig()

                    val json = LibraryItemObject(
                        v.id,
                        v.name,
                        v.description,
                        v.schemaVersion,
                        v.version,
                        accessConfig,
                        requirements,
                        libraryItem,
                    ).asJson.toString

                    os.write.over(os.pwd / "library" / "libraryItems" / s"${libraryItemType}" / s"${v.id}.json", json)

            val status = Status(code = Code.OK.index)
            Future.successful(UpdateLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateLibraryItemResponse(status = Some(status)))
        }

        try {

            val status = Status(code = Code.OK.index)
            Future.successful(UpdateLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateLibraryItemResponse(status = Some(status)))
        }

    override def deleteLibraryItem(request: DeleteLibraryItemRequest): Future[DeleteLibraryItemResponse] =
        try {
            os.remove(os.pwd/"library"/"libraryItems"/s"${listLibraryItemFromPb(request.itemsType)}"/s"${request.id}.json")

            val collectionJson = os.read(os.pwd / "library" / "collections" / s"${request.collectionId}.json")
            val collection = decode[Collection](collectionJson) match
                case Right(value) => value

            val itemsIds = collection.collectionItemIds.toList
            val newItemsIds = itemsIds.filterNot(_ == request.id)

            val newCollection = Collection(
                collection.id,
                collection.name,
                collection.description,
                newItemsIds.toArray,
            ).asJson.toString

            os.write.over(os.pwd / "library" / "collections" / s"${request.collectionId}.json", newCollection)

            val status = Status(code = Code.OK.index)
            Future.successful(DeleteLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteLibraryItemResponse(status = Some(status)))
        }
