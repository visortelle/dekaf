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

import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import scala.concurrent.{Await, ExecutionContext, Future}
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.{Duration, SECONDS}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val libraryRoot = config.libraryRoot.get

def getLibraryItemDir(itemType: LibraryItemType): String =
    itemType match
        case "consumer-session-config"                  => s"$libraryRoot/consumer-session-configs"
        case "producer-session-config"                  => s"$libraryRoot/producer-session-configs"
        case "markdown-document"                        => s"$libraryRoot/markdown-documents"
        case "message-filter"                           => s"$libraryRoot/message-filters"
        case "data-visualization-widget"    => s"$libraryRoot/data-visualization-widgets"
        case "data-visualization-dashboard" => s"$libraryRoot/data-visualization-dashboards"

class LibraryServiceImpl extends pb.LibraryServiceGrpc.LibraryService:
    val logger: Logger = Logger(getClass.getName)

    override def createLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] =
        logger.debug(s"Creating library item: ${request.item}")

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.CreateLibraryItemResponse(status = Some(status)))

    override def deleteLibraryItem(request: DeleteLibraryItemRequest): Future[DeleteLibraryItemResponse] = ???

    override def getLibraryItem(request: GetLibraryItemRequest): Future[GetLibraryItemResponse] = ???

    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] = ???

    override def updateLibraryItem(request: UpdateLibraryItemRequest): Future[UpdateLibraryItemResponse] = ???
