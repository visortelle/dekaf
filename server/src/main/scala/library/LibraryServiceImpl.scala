package library

import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.library.v1.library.{
    CreateLibraryItemRequest,
    CreateLibraryItemResponse,
    DeleteLibraryItemRequest,
    DeleteLibraryItemResponse,
    GetLibraryItemRequest,
    GetLibraryItemResponse,
    ListLibraryItemsRequest,
    ListLibraryItemsResponse,
    UpdateLibraryItemRequest,
    UpdateLibraryItemResponse
}
import pulsar_auth.RequestContext
import _root_.config.{readConfigAsync, Config}
import library.LibraryItemType.DataVisualizationDashboard

import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import scala.concurrent.{Await, ExecutionContext, Future}
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.{Duration, SECONDS}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val libraryRoot = config.libraryRoot.get

def getLibraryItemDir(itemType: LibraryItemType): String =
    itemType match
        case LibraryItemType.ConsumerSessionConfig      => s"$libraryRoot/consumer-session-configs"
        case LibraryItemType.ProducerSessionConfig      => s"$libraryRoot/producer-session-configs"
        case LibraryItemType.MarkdownDocument           => s"$libraryRoot/markdown-documents"
        case LibraryItemType.MessageFilter              => s"$libraryRoot/message-filters"
        case LibraryItemType.DataVisualizationWidget    => s"$libraryRoot/data-visualization-widgets"
        case LibraryItemType.DataVisualizationDashboard => s"$libraryRoot/data-visualization-dashboards"

class LibraryServiceImpl extends pb.LibraryServiceGrpc.LibraryService:
    val logger: Logger = Logger(getClass.getName)

    override def createLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] =
        logger.debug(s"Creating library item: ${request.item}")

        if request.item.isEmpty then
            val status: Status = Status(code = Code.INVALID_ARGUMENT.index)
            return Future.successful(pb.CreateLibraryItemResponse(status = Some(status)))

        val libraryItemType = libraryItemTypeFromPb(request.item.get.`type`)
        val libraryItemDir = getLibraryItemDir(libraryItemType)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.CreateLibraryItemResponse(status = Some(status)))

    override def deleteLibraryItem(request: DeleteLibraryItemRequest): Future[DeleteLibraryItemResponse] = ???

    override def getLibraryItem(request: GetLibraryItemRequest): Future[GetLibraryItemResponse] = ???

    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] = ???

    override def updateLibraryItem(request: UpdateLibraryItemRequest): Future[UpdateLibraryItemResponse] = ???
