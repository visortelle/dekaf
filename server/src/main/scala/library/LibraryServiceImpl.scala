package library

import _root_.client.adminClient
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.tools.teal.pulsar.ui.library.v1.library.{ Collection, CreateCollectionRequest, CreateCollectionResponse, CreateLibraryItemRequest, CreateLibraryItemResponse, DeleteCollectionRequest, DeleteCollectionResponse, DeleteLibraryItemRequest, DeleteLibraryItemResponse, LibraryServiceGrpc, ListCollectionsRequest, ListCollectionsResponse, ListLibraryItemsRequest, ListLibraryItemsResponse, UpdateCollectionRequest, UpdateCollectionResponse, UpdateLibraryItemRequest, UpdateLibraryItemResponse}
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.policies.data.BacklogQuota.{BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder}
import org.apache.pulsar.common.policies.data.{AuthAction, AutoSubscriptionCreationOverride, AutoTopicCreationOverride, BookieAffinityGroupData, BundlesData, DelayedDeliveryPolicies, DispatchRate, InactiveTopicDeleteMode, InactiveTopicPolicies, OffloadPolicies, OffloadedReadPriority, PersistencePolicies, Policies, PublishRate, RetentionPolicies, SubscribeRate, SubscriptionAuthMode}

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
import scala.reflect._

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

    override def createLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] =
        try {
            val status = Status(code = Code.OK.index)
            Future.successful(CreateLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateLibraryItemResponse(status = Some(status)))
        }

    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] =
        try {
            val status = Status(code = Code.OK.index)
            Future.successful(ListLibraryItemsResponse(status = Some(status)))
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
            val status = Status(code = Code.OK.index)
            Future.successful(DeleteLibraryItemResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteLibraryItemResponse(status = Some(status)))
        }
