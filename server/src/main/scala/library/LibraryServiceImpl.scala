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
import com.google.gson.{Gson, JsonObject}

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


    case class CollectionType(id: String, name: String, description: String, collectionItemIds: Array[String])

    case class AccessConfigType (
        userReadRoles: Array[String],
        userWriteRoles: Array[String],
        topicPatterns: Array[String],
    )
    case class NpmPackage (
        `type`: "npm_package",
        scope: String,
        packageName: String,
        version: String,
    )
    case class AppVersion (
        `type`: "app_version",
        version: String,
    )

    type Requirement = NpmPackage | AppVersion

    implicit val requirementEncoder: Encoder[Requirement] = Encoder.instance {
        case v @ NpmPackage(_, _, _, _) => v.asJson
        case v @ AppVersion(_, _) => v.asJson
    }

    case class MessageFilter (
        code: String
    )
    case class ProducerConfig ()
    case class MessagesVisualizationConfig ()
    case class ConsumerSessionConfig ()

    type LibraryItemData = MessageFilter | ConsumerSessionConfig | MessagesVisualizationConfig | ProducerConfig

    implicit val ItemDataEncodeEvent: Encoder[LibraryItemData] = Encoder.instance {
        case v @ MessageFilter(_) => v.asJson
        case v @ ConsumerSessionConfig() => v.asJson
        case v @ MessagesVisualizationConfig () => v.asJson
        case v @ ProducerConfig() => v.asJson
    }
    case class LibraryItemObject(
        id: String,
        name: String,
        description: String,
        schemaVersion: String,
        version: String,
        accessConfig: AccessConfigType,
        requirements: Array[Requirement],
        libraryItem: LibraryItemData,
    )

    given collectionDecoder: Decoder[CollectionType] = deriveDecoder
    given collectionEncoder: Encoder[CollectionType] = deriveEncoder

//    given filterDecoder: Decoder[LibraryItemObject] = deriveDecoder
//    given filterEncoder: Encoder[LibraryItemObject] = deriveEncoder
    given accessConfigEncoder: Encoder[AccessConfigType] = deriveEncoder
//    given requirementVersionEncoder: Encoder[RequirementVersion] = deriveEncoder
    given npmRequirementEncoder: Encoder[NpmPackage] = deriveEncoder
    given requirementDataTwoEncoder: Encoder[AppVersion] = deriveEncoder
//    given requirementsEncoder: Encoder[Requirement] = deriveEncoder

    given itemMessageFilter: Encoder[MessageFilter] = deriveEncoder
    given itemConsumerSessionConfig: Encoder[ConsumerSessionConfig] = deriveEncoder
    given itemMessagesVisualizationConfig: Encoder[MessagesVisualizationConfig] = deriveEncoder
    given itemProducerConfig: Encoder[ProducerConfig] = deriveEncoder
    given libraryItemObjectEncoder: Encoder[LibraryItemObject] = deriveEncoder
    given libraryItemObjectDecoder: Decoder[LibraryItemObject] = deriveDecoder

    override def createCollection(request: CreateCollectionRequest): Future[CreateCollectionResponse] =
        try {

            val collectionId = UUID.randomUUID()

            val json = request.collection match
                case Some(v) =>
                    CollectionType(
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
                    decode[CollectionType](os.read(path)) match
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

            println(allCollections)
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
                    CollectionType(
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

    override def createLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] =
        try {
            request.libraryItem match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "err")
                    Future.successful(CreateCollectionResponse(status = Some(status)))
                case Some(v) =>
                    var libraryItemType = "unspecified"
                    if v.libraryItem.messageFilter != None then
                        libraryItemType = "message_filter"
                    else if v.libraryItem.producerConfig != None then
                        libraryItemType = "producer_config"
                    else if v.libraryItem.consumerSessionConfig != None then
                        libraryItemType = "consumer_session_config"
                    else if v.libraryItem.messagesVisualizationConfig != None then
                        libraryItemType = "messages_visualization_config"

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

                    request.libraryItem match
                        case Some(v) =>
                            val requirements: Array[Requirement] = v.requirements.map(requirementFromPb).toArray

                            val accessConfig = v.accessConfig match
                                case Some(v) => AccessConfigType(
                                    v.userReadRoles.toArray,
                                    v.userWriteRoles.toArray,
                                    v.topicPatterns.toArray,
                                )
                                case None => AccessConfigType(Array(), Array(), Array())

                            val libraryItem: LibraryItemData = if (v.libraryItem.messagesVisualizationConfig != None) MessagesVisualizationConfig()
                                else if (v.libraryItem.producerConfig != None) then
                                    ProducerConfig()
                                else if (v.libraryItem.consumerSessionConfig != None) then
                                    ConsumerSessionConfig()
                                else v.libraryItem.messageFilter match
                                    case Some(value) => MessageFilter(value.code)

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
    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] =
        try {
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

            def requirementToPb(requirement: Requirement) = requirement match
                case NpmPackage("npm_package", scope, packageName, version) => NpmPackageRequirement(scope, packageName, version)
                case AppVersion("app_version", version) => pb.AppVersion(version)

            val collectionJson = os.read(os.pwd/"library"/"collections"/s"${request.collectionId}.json")
            val collection = decode[CollectionType](collectionJson) match
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
                    case MessageFilter => pb.LibraryItem.LibraryItem.MessageFilter()
                    case ConsumerSessionConfig => pb.LibraryItem.LibraryItem.ConsumerSessionConfig()
                    case MessagesVisualizationConfig => pb.LibraryItem.LibraryItem.MessagesVisualizationConfig()
                    case ProducerConfig => pb.LibraryItem.LibraryItem.ProducerConfig()

//                val libraryItem: LibraryItemData = if (v.libraryItem.messagesVisualizationConfig != None) MessagesVisualizationConfig()
//                    else if (v.libraryItem.producerConfig != None) then
//                        ProducerConfig()
//                    else if (v.libraryItem.consumerSessionConfig != None) then
//                        ConsumerSessionConfig()
//                    else v.libraryItem.messageFilter match
//                        case Some(value) => MessageFilter(value.code)

                pb.LibraryItem(
                    item.id,
                    item.name,
                    item.version,
                    item.description,
                    item.schemaVersion,
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
            val status = Status(code = Code.OK.index)
            Future.successful(UpdateLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateLibraryItemResponse(status = Some(status)))
        }

    override def deleteLibraryItem(request: DeleteLibraryItemRequest): Future[DeleteLibraryItemResponse] =
        try {
            val f = new File(s"${library}/libraryItems/${request.id}.json")
            f.delete()

            val status = Status(code = Code.OK.index)
            Future.successful(DeleteLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteLibraryItemResponse(status = Some(status)))
        }
