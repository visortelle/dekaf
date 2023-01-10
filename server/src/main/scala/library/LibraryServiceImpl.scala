package library

import _root_.client.adminClient
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.tools.teal.pulsar.ui.library.v1.library.{CreateCollectionRequest, CreateCollectionResponse, CreateLibraryItemRequest, CreateLibraryItemResponse, DeleteCollectionRequest, DeleteCollectionResponse, DeleteLibraryItemRequest, DeleteLibraryItemResponse, LibraryServiceGrpc, ListCollectionsRequest, ListCollectionsResponse, ListLibraryItemsRequest, ListLibraryItemsResponse, UpdateCollectionRequest, UpdateCollectionResponse, UpdateLibraryItemRequest, UpdateLibraryItemResponse}
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.policies.data.BacklogQuota.{BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder}
import org.apache.pulsar.common.policies.data.{AuthAction, AutoSubscriptionCreationOverride, AutoTopicCreationOverride, BookieAffinityGroupData, BundlesData, DelayedDeliveryPolicies, DispatchRate, InactiveTopicDeleteMode, InactiveTopicPolicies, OffloadPolicies, OffloadedReadPriority, PersistencePolicies, Policies, PublishRate, RetentionPolicies, SubscribeRate, SubscriptionAuthMode}

import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*
import scala.concurrent.Future
import _root_.config.readConfigAsync
import com.google.gson.{Gson, JsonObject}

import java.nio.file.{Files, Paths}
import java.io.*
import java.util.stream.Collectors
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

class LibraryServiceImpl extends LibraryServiceGrpc.LibraryService:

    val library = Await.result(readConfigAsync, Duration(10, SECONDS)).library

    override def createCollection(request: CreateCollectionRequest): Future[CreateCollectionResponse] =
        try {
            val rootPath = Paths.get(s"${library}")
            if (!Files.isDirectory(rootPath)) {
                val rootFolder = new File(s"${library}")
                rootFolder.mkdir()
            }

            val libraryPath = Paths.get(s"${library}/collections/")
            if (!Files.isDirectory(libraryPath)) {
                val libraryFolder = new File(s"${library}/collections/")
                libraryFolder.mkdir()
            }

            val f = new File(s"${library}/collections/collection.json")
            if (f.isFile) {
                val input: java.util.Map[String, String] = Map("red" -> "#FF0000", "azure" -> "#F0FFFF").asJava
                val json: String = new Gson().toJson(input)
                val file = new FileWriter(s"${library}/collections/collection.json", false)

                file.write(json)
                file.close()

                val status = Status(code = Code.OK.index)
                Future.successful(CreateCollectionResponse(status = Some(status)))
            }
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateCollectionResponse(status = Some(status)))
        }

    override def listCollections(request: ListCollectionsRequest): Future[ListCollectionsResponse] =

        try {
            val dir = Paths.get(s"${library}/collections/")

            val stream = Files.newDirectoryStream(dir, "*.json").asScala

            for (p <- stream) {

                val lines = Files.lines(p);
                val data = lines.collect(Collectors.joining(System.lineSeparator()));

                println(data)
                lines.close();
            }

            val status = Status(code = Code.OK.index)
            Future.successful(ListCollectionsResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ListCollectionsResponse(status = Some(status)))
        }

    override def updateCollection(request: UpdateCollectionRequest): Future[UpdateCollectionResponse] =
        try {
            val status = Status(code = Code.OK.index)
            Future.successful(UpdateCollectionResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateCollectionResponse(status = Some(status)))
        }

    override def deleteCollection(request: DeleteCollectionRequest): Future[DeleteCollectionResponse] =
        try {
            val f = new File(s"${library}/collections/collection.json   ")
                f.delete()
                println("deleted")

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
