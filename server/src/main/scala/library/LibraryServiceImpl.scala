package library

import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.library.v1.library.{
    DeleteLibraryItemRequest,
    DeleteLibraryItemResponse,
    GetLibraryItemRequest,
    GetLibraryItemResponse,
    ListLibraryItemsRequest,
    ListLibraryItemsResponse,
    SaveLibraryItemRequest,
    SaveLibraryItemResponse
}
import pulsar_auth.RequestContext
import _root_.config.{readConfigAsync, Config}
import com.fasterxml.uuid.Generators.timeBasedEpochGenerator as uuidV7

import io.circe.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson

import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import scala.concurrent.{Await, ExecutionContext, Future}
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.{Duration, SECONDS}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val libraryRoot = config.libraryRoot.get

class LibraryServiceImpl extends pb.LibraryServiceGrpc.LibraryService:
    val logger: Logger = Logger(getClass.getName)
    val library: Library = Library.createAndRefreshDb(libraryRoot)

    override def saveLibraryItem(request: SaveLibraryItemRequest): Future[SaveLibraryItemResponse] =
        logger.debug(s"Updating library item: ${request.item}")

        try {
            if request.item.isEmpty then throw new Exception("Library item is empty")

            val libraryItem = libraryItemFromPb(request.item.get)
            library.writeItem(libraryItem)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.SaveLibraryItemResponse(status = Some(status)))
        } catch {
            case err: Exception =>
                logger.warn(s"Failed to save library item: ${err.getMessage}")
                val status: Status = Status(code = Code.INTERNAL.index, message = s"Unable to save library item. ${err.getMessage}}")
                Future.successful(pb.SaveLibraryItemResponse(status = Some(status)))
        }

    override def deleteLibraryItem(request: DeleteLibraryItemRequest): Future[DeleteLibraryItemResponse] =
        logger.debug(s"Deleting library item: ${request.id}")

        try {
            if request.id.isEmpty then throw new Exception("Library item id is empty")

            library.deleteItem(request.id)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteLibraryItemResponse(status = Some(status)))
        } catch {
            case e: Exception =>
                logger.warn(s"Failed to delete library item: ${e.getMessage}")
                val status: Status = Status(code = Code.INTERNAL.index, message = "Unable to delete library item")
                Future.successful(pb.DeleteLibraryItemResponse(status = Some(status)))
        }

    override def getLibraryItem(request: GetLibraryItemRequest): Future[GetLibraryItemResponse] =
        logger.debug(s"Getting library item: ${request.id}")

        try {
            if request.id.isEmpty then throw new Exception("Library item id is empty")

            val libraryItem = library.getItemById(request.id)

            if libraryItem.isEmpty then throw new Exception(s"Library item with id ${request.id} not found")
            val libraryItemPb = libraryItemToPb(libraryItem.get)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.GetLibraryItemResponse(status = Some(status), item = Some(libraryItemPb)))
        } catch {
            case e: Exception =>
                logger.warn(s"Failed to get library item: ${e.getMessage}")
                val status: Status = Status(code = Code.INTERNAL.index, message = s"Unable to get library item. ${e.getMessage}")
                Future.successful(pb.GetLibraryItemResponse(status = Some(status)))
        }

    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] =
        logger.debug(s"Listing library items")

        try {
            val filter = ListItemsFilter(
                types = request.types.map(userManagedItemTypeFromPb).toList,
                tags = request.tags.toList,
                resourceFqns = request.resourceFqns.toList,
                name = request.name,
                description = request.description
            )
            val libraryItems = library.listItems(filter)

            val libraryItemsPb = libraryItems.map(libraryItemToPb).toList

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.ListLibraryItemsResponse(status = Some(status), items = libraryItemsPb))
        } catch {
            case e: Exception =>
                logger.warn(s"Failed to list library items: ${e.getMessage}")
                val status: Status = Status(code = Code.INTERNAL.index, message = s"Unable to list library items. ${e.getMessage}")
                Future.successful(pb.ListLibraryItemsResponse(status = Some(status)))
        }
