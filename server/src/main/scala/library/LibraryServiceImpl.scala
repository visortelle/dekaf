package library

import _root_.client.adminClient
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.tools.teal.pulsar.ui.library.v1.library.{AccessConfig, Collection, CreateCollectionRequest, CreateCollectionResponse, CreateLibraryItemRequest, CreateLibraryItemResponse, DeleteCollectionRequest, DeleteCollectionResponse, DeleteLibraryItemRequest, DeleteLibraryItemResponse, LibraryItem, LibraryServiceGrpc, ListCollectionsRequest, ListCollectionsResponse, ListLibraryItemsRequest, ListLibraryItemsResponse, Requirement, UpdateCollectionRequest, UpdateCollectionResponse, UpdateLibraryItemRequest, UpdateLibraryItemResponse}
import org.apache.pulsar.client.api.SubscriptionType

import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*
import scala.concurrent.Future
import _root_.config.readConfigAsync
import com.fasterxml.jackson.databind.ObjectMapper
import com.google.gson.{Gson, JsonObject}
import com.tools.teal.pulsar.ui.library.v1.library.Requirement.Requirement.{AppVersion, NpmPackage}

import java.nio.file.{Files, Paths}
import java.io.*
import java.util.UUID
import java.util.stream.Collectors
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.reflect.ClassTag
import scala.reflect.*

class LibraryServiceImpl extends LibraryServiceGrpc.LibraryService:

    val library = Await.result(readConfigAsync, Duration(10, SECONDS)).library
    val gson = new Gson()
    case class CollectionType(id: String, name: String, description: String, collectionItemIds: Array[String])
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
                println("I'm dead")
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

//    enum LibraryItemType {
//        case message_filter, consumer_session_config, messages_visualization_config, producer_config, unspecified
//    }

    enum RequirementType {
        case app_version, npm_package, unspecified
    }
    type RequirementObjectType = "app_version" | "npm_pachage" | "unspecified"
    case class RequirementObject (
        id: String,
        `type`: String,
//        requirement: AppVersion | NpmPackage,
        requirement: Requirement.Requirement
     )
    case class LibraryItemType(
      id: String,
      name: String,
      description: String,
      schemaVersion: String,
      version: String,
      accessConfig: AccessConfig,
      requirements: Array[RequirementObject],
      libraryItem:  LibraryItem.LibraryItem,
    )
    override def createLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] =
        try {
            val libraryItem = request.libraryItem match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "err")
                    Future.successful(CreateCollectionResponse(status = Some(status)))
                case Some(v) =>

//                    def listLibraryItemFromPb(libraryPb: pb.LibraryItem.LibraryItem): LibraryItemType = libraryPb match
//                        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER =>
//                            LibraryItemType.message_filter
//                        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_CONFIG =>
//                            LibraryItemType.producer_config
//                        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGES_VISUALIZATION_CONFIG =>
//                            LibraryItemType.messages_visualization_config
//                        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG =>
//                            LibraryItemType.consumer_session_config
//                        case _ => LibraryItemType.unspecified

                    def requirementTypeFromPb(typePb: pb.RequirementType): RequirementType = typePb match
                        case pb.RequirementType.REQUIREMENT_TYPE_APP_VERSION => RequirementType.app_version
                        case pb.RequirementType.REQUIREMENT_TYPE_NPM_PACKAGE => RequirementType.npm_package
                        case _ => RequirementType.unspecified

                    val rootPath = Paths.get(s"${library}")
                    if (!Files.isDirectory(rootPath)) {
                        val rootFolder = new File(s"${library}")
                        rootFolder.mkdir()
                    }

                    val rootLibraryItemsPath = Paths.get(s"${library}/libraryItems/")
                    if (!Files.isDirectory(rootLibraryItemsPath))
                        val libraryFolder = new File(s"${library}/libraryItems/")
                        libraryFolder.mkdir()

                    val libraryItemsPath = Paths.get(s"${library}/libraryItems/${v.libraryItem}")
                    if (!Files.isDirectory(libraryItemsPath))
                        val libraryFolder = new File(s"${library}/libraryItems/${v.libraryItem}")
                        libraryFolder.mkdir()

                    val libraryItemId = UUID.randomUUID().toString
                    val f = new File(s"${library}/libraryItems/${v.libraryItem}/${libraryItemId}.json")

                    if (!f.isFile)
                        request.libraryItem match
                            case Some(v) =>
                                val requirements = v.requirements.map(requirement =>
                                    RequirementObject (
                                        requirement.id,
                                        requirementTypeFromPb(requirement.`type`).toString,
//                                        requirement.`type`,
                                        requirement.requirement,
                                    )
                                )
                                val accessConfig = v.accessConfig match
                                    case Some(v) => v
                                    case None => pb.AccessConfig()

                                val libraryItemObject = LibraryItemType(
                                    libraryItemId,
                                    v.name,
                                    v.description,
                                    v.schemaVersion,
                                    v.version,
                                    accessConfig,
                                    requirements.toArray,
                                    v.libraryItem,
                                )

                                val json: String = gson.toJson(libraryItemObject)
                                val file = new FileWriter(s"${library}/libraryItems/${v.libraryItem}/${libraryItemId}.json", false)

                                file.write(json)
                                file.close()

            val status = Status(code = Code.OK.index)
            Future.successful(CreateLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateLibraryItemResponse(status = Some(status)))
        }

    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] =
        try {
            val collectionObject = gson.fromJson(new FileReader(s"${library}/collections/${request.collectionId}.json"), classOf[CollectionType])

            val libraryItemsList = collectionObject.collectionItemIds.map(collectionItem =>
                val item = gson.fromJson(new FileReader(s"${library}/libraryItems/${request.itemsType}/${collectionItem}.json"), classOf[LibraryItem])
                LibraryItem(
                  item.id,
                  item.name,
                item.version,
                item.description,
                item.schemaVersion,
                item.accessConfig,
                item.requirements,
                item.libraryItem,
                )
            ).toSeq

//            val dir = Paths.get(s"${library}/libraryItems/")
//            val stream = Files.newDirectoryStream(dir, "*.json").asScala

//            def listLibraryItemFromPb(itemPb: pb.LibraryItem): LibraryItem = policyPb match
//                case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION =>
//                    RetentionPolicy.consumer_backlog_eviction
//                case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_REQUEST_HOLD =>
//                    RetentionPolicy.producer_request_hold
//                case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_EXCEPTION =>
//                    RetentionPolicy.producer_exception
//                case _ => RetentionPolicy.producer_request_hold

//            val libraryItemsList = stream.map(p => {
//                val libraryItemsObject = gson.fromJson(new FileReader(p.toString), classOf[LibraryItem])
//                LibraryItem (
//                    libraryItemsObject.id,
//                    libraryItemsObject.name,
//                    libraryItemsObject.description,
//                    libraryItemsObject.version,
//                    libraryItemsObject.schemaVersion,
//
//                    libraryItemsObject.accessConfig,
//                    libraryItemsObject.requirements,
//                    libraryItemsObject.libraryItem,
//                )
//            }).toSeq

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
