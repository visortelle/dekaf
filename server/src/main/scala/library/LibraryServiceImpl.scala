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

    override def createLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] = ???
//        logger.debug(s"Creating library item: ${request.item}")
//
//        try {
//            if request.item.isEmpty then
//                throw new Exception("Library item is empty")
//
//            val libraryItemId = uuidV7().generate().toString
//            val libraryItem = libraryItemFromPb(request.item.get).copy(id = libraryItemId)
//            val libraryItemJson = libraryItem.asJson.spaces2SortKeys
//
//            val fileName = s"${libraryItemId}.json"
//            val filePath = s"$libraryItemDir/$fileName"
//
//            val isExists = os.exists(os.Path(filePath))
//            if isExists then
//                throw new Exception(s"Library item already exists: $libraryItemId")
//
//            os.write.over(
//                target = os.Path(fileName),
//                data = libraryItemJson,
//                createFolders = true
//            )
//
//            val status: Status = Status(code = Code.OK.index)
//            Future.successful(pb.CreateLibraryItemResponse(status = Some(status)))
//        } catch {
//            case err: Exception =>
//                logger.warn(s"Failed to create library item: ${err.getMessage}")
//                val status: Status = Status(code = Code.INTERNAL.index, message = s"Unable to create library item. ${err.getMessage}")
//                Future.successful(pb.CreateLibraryItemResponse(status = Some(status)))
//        }

    override def updateLibraryItem(request: UpdateLibraryItemRequest): Future[UpdateLibraryItemResponse] = ???
//        logger.debug(s"Updating library item: ${request.item}")
//
//        try {
//            if request.item.isEmpty then
//                throw new Exception("Library item is empty")
//
//            val libraryItem = libraryItemFromPb(request.item.get)
//            val libraryItemDir = getDefaultLibraryItemDir(libraryItem.`type`)
//            val fileName = mkFileName(libraryItem)
//
//            if !os.exists(os.Path(fileName)) then
//                throw new Exception(s"Library item does not exist: ${request.item.get.id}")
//
//            val libraryItemJson = libraryItem.asJson.spaces2SortKeys
//
//            os.write.over(
//                target = os.Path(fileName),
//                data = libraryItemJson
//            )
//
//            val status: Status = Status(code = Code.OK.index)
//            Future.successful(pb.UpdateLibraryItemResponse(status = Some(status)))
//        } catch {
//            case err: Exception =>
//                logger.warn(s"Failed to update library item: ${err.getMessage}")
//                val status: Status = Status(code = Code.INTERNAL.index, message = s"Unable to update library item. ${err.getMessage}}")
//                Future.successful(pb.UpdateLibraryItemResponse(status = Some(status)))
//        }

    override def deleteLibraryItem(request: DeleteLibraryItemRequest): Future[DeleteLibraryItemResponse] = ???
//        logger.debug(s"Deleting library item: ${request.id}")
//
//        try {
//            val libraryItemType = libraryItemTypeFromPb(request.`type`)
//            val libraryItemDir = getDefaultLibraryItemDir(libraryItemType)
//            val libraryItemFile = s"$libraryItemDir/${request.id}.json"
//
//            os.remove(os.Path(libraryItemFile))
//
//            val status: Status = Status(code = Code.OK.index)
//            Future.successful(pb.DeleteLibraryItemResponse(status = Some(status)))
//        } catch {
//            case e: Exception =>
//                logger.warn(s"Failed to delete library item: ${e.getMessage}")
//                val status: Status = Status(code = Code.INTERNAL.index, message = "Unable to delete library item")
//                Future.successful(pb.DeleteLibraryItemResponse(status = Some(status)))
//        }

    override def getLibraryItem(request: GetLibraryItemRequest): Future[GetLibraryItemResponse] = ???
//        logger.debug(s"Getting library item: ${request.id}")
//
//        try {
//            val libraryItemType = libraryItemTypeFromPb(request.`type`)
//            val libraryItemDir = getDefaultLibraryItemDir(libraryItemType)
//            val libraryItemFile = s"$libraryItemDir/${request.id}.json"
//
//            val libraryItemJson = os.read(os.Path(libraryItemFile))
//            val libraryItem = parseJson(libraryItemJson) match
//                case Right(json) => json.as[LibraryItem] match
//                    case Right(libraryItem) => libraryItem
//                    case Left(err) => throw new Exception(err)
//                case Left(err) => throw new Exception(err)
//
//            val libraryItemPb = libraryItemToPb(libraryItem)
//
//            val status: Status = Status(code = Code.OK.index)
//            Future.successful(pb.GetLibraryItemResponse(status = Some(status), item = Some(libraryItemPb)))
//        } catch {
//            case e: Exception =>
//                logger.warn(s"Failed to get library item: ${e.getMessage}")
//                val status: Status = Status(code = Code.INTERNAL.index, message = s"Unable to get library item. ${e.getMessage}")
//                Future.successful(pb.GetLibraryItemResponse(status = Some(status)))
//        }

    override def listLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] = ???
