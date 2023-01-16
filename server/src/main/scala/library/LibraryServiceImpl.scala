package library

import _root_.client.adminClient
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.tools.teal.pulsar.ui.library.v1.library.{ LibraryItem, AccessConfig, Collection, CreateCollectionRequest, CreateCollectionResponse, CreateLibraryItemRequest, CreateLibraryItemResponse, DeleteCollectionRequest, DeleteCollectionResponse, DeleteLibraryItemRequest, DeleteLibraryItemResponse, LibraryServiceGrpc, ListCollectionsRequest, ListCollectionsResponse, ListLibraryItemsRequest, ListLibraryItemsResponse, NpmPackageRequirement, Requirement, UpdateCollectionRequest, UpdateCollectionResponse, UpdateLibraryItemRequest, UpdateLibraryItemResponse}
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
//import io.circe.generic.auto._

class LibraryServiceImpl extends LibraryServiceGrpc.LibraryService:

    val library = Await.result(readConfigAsync, Duration(10, SECONDS)).library
    val gson = new Gson()
    var root = os.root


    case class CollectionType(id: String, name: String, description: String, collectionItemIds: Array[String])
//    given collectionDecoder: Decoder[CollectionType] = deriveDecoder
//    given collectionEncoder: Encoder[CollectionType] = deriveEncoder

    case class AccessConfigType (
        userReadRoles: Array[String],
        userWriteRoles: Array[String],
        topicPatterns: Array[String],
    )
    enum RequirementVersionType {
        case app_version, npm_package, unspecified
    }
    case class NpmPackage (
        scope: String,
        packageName: String,
        version: String,
    )
    case class AppVersion (
        appVersion: String,
    )

    type RequirementData = NpmPackage | AppVersion

    implicit val requirementDataEncodeEvent: Encoder[RequirementData] = Encoder.instance {
        case v @ NpmPackage(_, _, _) => v.asJson
        case v @ AppVersion(_) => v.asJson
    }
    case class RequirementType (
        id: String,
        `type`: RequirementVersionType,
        requirement: RequirementData
    )


    //    given accessDecoder: Decoder[AccessConfig] = deriveDecoder

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
        requirements: Array[RequirementType],
        libraryItem: LibraryItemData,
    )

//    Unable to create filter: MessageFilter(LibraryItemMessageFilter(,UnknownFieldSet(Map()))) (
//        of class com.tools.teal.pulsar.ui.library.v1.library.LibraryItem$LibraryItem$MessageFilter)



//    given filterDecoder: Decoder[LibraryItemObject] = deriveDecoder
//    given filterEncoder: Encoder[LibraryItemObject] = deriveEncoder
    given accessConfigEncoder: Encoder[AccessConfigType] = deriveEncoder
    given requirementVersionEncoder: Encoder[RequirementVersionType] = deriveEncoder
    given requirementDataEncoder: Encoder[NpmPackage] = deriveEncoder
    given requirementDataTwoEncoder: Encoder[AppVersion] = deriveEncoder
    given requirementsEncoder: Encoder[RequirementType] = deriveEncoder

    given itemMessageFilter: Encoder[MessageFilter] = deriveEncoder
    given itemConsumerSessionConfig: Encoder[ConsumerSessionConfig] = deriveEncoder
    given itemMessagesVisualizationConfig: Encoder[MessagesVisualizationConfig] = deriveEncoder
    given itemProducerConfig: Encoder[ProducerConfig] = deriveEncoder
    given libraryItemObjectEncoder: Encoder[LibraryItemObject] = deriveEncoder

    /////!!!
//    case class AttrsKebab(attrA: String, attrB: String)
//
////    object AttrsKebab {
////        private implicit final val config: Configuration =
////
////            Configuration.default.withKebabCaseMemberNames
////
////        implicit final val AttrsKebabDecoder: Decoder[AttrsKebab] =
////            deriveConfiguredDecoder
////    }
//
//     case class ItemKebab(foo: String)
//
//    object ItemKebab {
//        implicit final val ItemKebabDecoder: Decoder[ItemKebab] =
//            deriveDecoder
//    }
//
//    case class ParentKebab(name: String, items: List[ItemKebab])
//
//    object ParentKebab {
//        implicit final val ParentKebabDecoder: Decoder[ParentKebab] =
//            deriveDecoder
//    }
//
//    case class DataKebab(parent: ParentKebab)
//
//    object DataKebab {
//        implicit final val DataKebabDecoder: Decoder[DataKebab] =
//            deriveDecoder
//    }
    /////!!!






    override def createCollection(request: CreateCollectionRequest): Future[CreateCollectionResponse] =
        try {
            val rootPath = Paths.get(s"${library}")
            if (!Files.isDirectory(rootPath)) {
                val rootFolder = new File(s"${library}")
                rootFolder.mkdir()
            }

            val libraryPath = Paths.get(s"${library}/collections/")
            if (!Files.isDirectory(libraryPath))
                val libraryFolder = new File(s"${library}/collections/")
                libraryFolder.mkdir()

            val collectionId = UUID.randomUUID()
            val f = new File(s"${library}/collections/${collectionId}.json")

            if (!f.isFile)
                val collectionConfig = request.collection match
                    case None =>
                        val status = Status(code = Code.FAILED_PRECONDITION.index, message = "err")
                        Future.successful(CreateCollectionResponse(status = Some(status)))
                    case Some(v) =>
                        CollectionType(
                            collectionId.toString,
                            v.name,
                            v.description,
                            v.collectionItemIds.toArray
                        )

                val json: String = gson.toJson(collectionConfig)
                val file = new FileWriter(s"${library}/collections/${collectionId}.json", false)

                file.write(json)
                file.close()

            val status = Status(code = Code.OK.index)
            Future.successful(CreateCollectionResponse(status = Some(status)))

        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateCollectionResponse(status = Some(status)))
        }

    override def listCollections(request: ListCollectionsRequest): Future[ListCollectionsResponse] =

        try {
            val dir = Paths.get(s"${library}/collections/")
            val stream = Files.newDirectoryStream(dir, "*.json").asScala

            val allCollections = stream.map(p => {
                val collectionObject = gson.fromJson(new FileReader(p.toString), classOf[CollectionType])
                Collection (
                    collectionObject.id,
                    collectionObject.name,
                    collectionObject.description,
                    collectionObject.collectionItemIds.toSeq
                )
            }).toSeq

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
            var collectionId = ""
            val collectionConfig = request.collection match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "err")
                    Future.successful(CreateCollectionResponse(status = Some(status)))
                case Some(v) =>
                    collectionId = v.id
                    CollectionType(
                        v.id,
                        v.name,
                        v.description,
                        v.collectionItemIds.toArray
                    )

            val json: String = gson.toJson(collectionConfig)

            val file = new FileWriter(s"${library}/collections/${collectionId}.json", false)

            file.write(json)
            file.close()

            val status = Status(code = Code.OK.index)
            Future.successful(UpdateCollectionResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateCollectionResponse(status = Some(status)))
        }

    override def deleteCollection(request: DeleteCollectionRequest): Future[DeleteCollectionResponse] =
        try {
            val f = new File(s"${library}/collections/${request.id}.json")
                f.delete()

            val status = Status(code = Code.OK.index)
            Future.successful(DeleteCollectionResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteCollectionResponse(status = Some(status)))
        }

    enum LibraryItemType {
        case message_filter, consumer_session_config, messages_visualization_config, producer_config, unspecified
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

                    def requirementTypeFromPb(typePb: pb.RequirementType): RequirementVersionType = typePb match
                        case pb.RequirementType.REQUIREMENT_TYPE_APP_VERSION => RequirementVersionType.app_version
                        case pb.RequirementType.REQUIREMENT_TYPE_NPM_PACKAGE => RequirementVersionType.npm_package
                        case _ => RequirementVersionType.unspecified

                    request.libraryItem match
                        case Some(v) =>
                            val requirements = v.requirements.map(requirement =>

                                val requirementId = UUID.randomUUID().toString

                                val data: NpmPackage | AppVersion = if (requirement.requirement.npmPackage != null) requirement.requirement.npmPackage match
                                    case Some(v) =>
                                        NpmPackage (
                                            v.scope,
                                            v.packageName,
                                            v.version,
                                        )
                                    else
                                    requirement.requirement.appVersion match
                                        case Some(v) =>
                                            AppVersion(
                                                v
                                            )

                                RequirementType (
                                    requirementId,
                                    requirementTypeFromPb(requirement.`type`),
                                    data
                                )
                            ).toArray

                            val accessConfig = v.accessConfig match
                                case Some(v) => AccessConfig(
                                    v.userReadRoles,
                                    v.userWriteRoles,
                                    v.topicPatterns,
                                )
                                case None => AccessConfig(Seq(), Seq(), Seq())

//                            val libraryItem: LibraryItemData = v.libraryItem match
//                                case v @ MessageFilter(code) => MessageFilter(code)
//                                case v @ ConsumerSessionConfig() => ConsumerSessionConfig()
//                                case v @ MessagesVisualizationConfig() => MessagesVisualizationConfig()
//                                case v @ ProducerConfig() => ProducerConfig()

                            var libraryItemType = "unspecified"
                            if v.libraryItem.messageFilter != None then
                                libraryItemType = "message_filter"
                            else if v.libraryItem.producerConfig != None then
                                libraryItemType = "producer_config"
                            else if v.libraryItem.consumerSessionConfig != None then
                                libraryItemType = "consumer_session_config"
                            else if v.libraryItem.messagesVisualizationConfig != None then
                                libraryItemType = "messages_visualization_config"

                            val libraryItemId = UUID.randomUUID().toString

                            val json = LibraryItemObject(
                                libraryItemId,
                                v.name,
                                v.description,
                                v.schemaVersion,
                                v.version,
                                AccessConfigType(
                                  accessConfig.userReadRoles.toArray,
                                  accessConfig.userWriteRoles.toArray,
                                  accessConfig.topicPatterns.toArray,
                                ),
                                requirements,
                                libraryItem
                            ).asJson.toString

//                            aryItemObject = LibraryItemObject(
//                                libraryItemId,
//                                v.name,
//                                v.description,
//                                v.schemaVersion,
//                                v.version,
//                                accessConfig,
//                                //                                    requirements,
//                                //                                    v.libraryItem,
//                            )
//                            val json = libraryItemObject.asJson.toString

                            os.write(os.pwd/"library"/"libraryItems"/s"${libraryItemType}"/s"${libraryItemId}.json", json, null, true)

            val status = Status(code = Code.OK.index)
            Future.successful(CreateLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateLibraryItemResponse(status = Some(status)))
        }

    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] =
        try {
//            def listLibraryItemFromPb(libraryPb: pb.LibraryItemType): LibraryItemType = libraryPb match
//                case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER =>
//                    LibraryItemType.message_filter
//                case pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_CONFIG =>
//                    LibraryItemType.producer_config
//                case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGES_VISUALIZATION_CONFIG =>
//                    LibraryItemType.messages_visualization_config
//                case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG =>
//                    LibraryItemType.consumer_session_config
//                case _ => LibraryItemType.unspecified
//
//            val collectionJson = os.read(os.pwd/"library"/"collections"/s"${request.collectionId}.json")
//            val collection = decode[CollectionType](collectionJson) match
//                case Right(value) => value
//
//            val libraryItemsList = collection.collectionItemIds.toList.map(collectionItem =>
//
//                val itemJson = os.read(os.pwd/"library"/"libraryItems"/s"${listLibraryItemFromPb(request.itemsType)}"/s"${collectionItem}.json")
////
//                val item = decode[LibraryItemObject](itemJson) match
//                    case Right(value) => value
////
////                    pb.LibraryItem(
////                        item.id,
////                        item.name,
////                        item.version,
////                        item.description,
////                        item.schemaVersion,
//////                        Option(item.accessConfig),
//////                        item.requirements.toSeq,
//////                        item.libraryItem,
////                    )
//                println(item)
//            )

//            println(libraryItemsList)

            val status = Status(code = Code.OK.index)
            Future.successful(ListLibraryItemsResponse(
                status = Some(status),
//                libraryItems = libraryItemsList
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
