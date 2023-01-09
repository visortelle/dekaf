package library

import _root_.client.adminClient
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.library.v1.library as pb
import com.tools.teal.pulsar.ui.library.v1.library.{ LibraryServiceGrpc, CreateCollectionRequest, CreateCollectionResponse, CreateLibraryItemRequest, CreateLibraryItemResponse, DeleteCollectionRequest, DeleteCollectionResponse, DeleteLibraryItemRequest, DeleteLibraryItemResponse, ListCollectionsRequest, ListCollectionsResponse, ListLibraryItemsRequest, ListLibraryItemsResponse, UpdateCollectionRequest, UpdateCollectionResponse, UpdateLibraryItemRequest, UpdateLibraryItemResponse}
import org.apache.pulsar.client.api.SubscriptionType


import org.apache.pulsar.common.policies.data.BacklogQuota.{BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder}
import org.apache.pulsar.common.policies.data.{AuthAction, AutoSubscriptionCreationOverride, AutoTopicCreationOverride, BookieAffinityGroupData, BundlesData, DelayedDeliveryPolicies, DispatchRate, InactiveTopicDeleteMode, InactiveTopicPolicies, OffloadPolicies, OffloadedReadPriority, PersistencePolicies, Policies, PublishRate, RetentionPolicies, SubscribeRate, SubscriptionAuthMode}

import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*
import scala.concurrent.Future

class LibraryServiceImpl extends LibraryServiceGrpc.LibraryService:

    override def CreateCollection(request: CreateCollectionRequest): Future[CreateCollectionResponse] = ???
//    override def CreateCollection(request: CreateCollectionRequest): Future[CreateCollectionResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(CreateCollectionResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(CreateCollectionResponse(status = Some(status)))
//        }
//
//    override def ListCollections(request: ListCollectionsRequest): Future[ListCollectionsResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(ListCollectionsResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(ListCollectionsResponse(status = Some(status)))
//        }
//
//    override def UpdateCollection(request: UpdateCollectionRequest): Future[UpdateCollectionResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(UpdateCollectionResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(UpdateCollectionResponse(status = Some(status)))
//        }
//
//    override def DeleteCollection(request: DeleteCollectionRequest): Future[DeleteCollectionResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(DeleteCollectionResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(DeleteCollectionResponse(status = Some(status)))
//        }
//
//    override def CreateLibraryItem(request: CreateLibraryItemRequest): Future[CreateLibraryItemResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(CreateLibraryItemResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(CreateLibraryItemResponse(status = Some(status)))
//        }
//
//    override def ListLibraryItems(request: ListLibraryItemsRequest): Future[ListLibraryItemsResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(ListLibraryItemsResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(ListLibraryItemsResponse(status = Some(status)))
//        }
//
//    override def UpdateLibraryItem(request: UpdateLibraryItemRequest): Future[UpdateLibraryItemResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(UpdateLibraryItemResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(UpdateLibraryItemResponse(status = Some(status)))
//        }
//
//    override def DeleteLibraryItem(request: DeleteLibraryItemRequest): Future[DeleteLibraryItemResponse] =
//        try {
//            val status = Status(code = Code.OK.index)
//            Future.successful(DeleteLibraryItemResponse(status = Some(status)))
//        } catch {
//            case err =>
//                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(DeleteLibraryItemResponse(status = Some(status)))
//        }
