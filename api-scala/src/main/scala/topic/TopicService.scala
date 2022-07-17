package topic

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import com.tools.teal.pulsar.ui.api.v1.topic.{
    CursorStats,
    GetPartitionedTopicInternalStatsRequest,
    GetPartitionedTopicInternalStatsResponse,
    GetTopicInternalStatsRequest,
    GetTopicInternalStatsResponse,
    LedgerInfo,
    PartitionedTopicInternalStats,
    PartitionedTopicMetadata,
    TopicServiceGrpc
}
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code

class TopicServiceImpl extends TopicServiceGrpc.TopicService:
    val logger = Logger(getClass.getName)

    override def getTopicInternalStats(request: GetTopicInternalStatsRequest): Future[GetTopicInternalStatsResponse] =
        val status: Status = Status(code = Code.OK.index)
        Future.successful(GetTopicInternalStatsResponse(status = Some(status)))

    override def getPartitionedTopicInternalStats(
        request: GetPartitionedTopicInternalStatsRequest
    ): Future[GetPartitionedTopicInternalStatsResponse] =
        val status: Status = Status(code = Code.OK.index)
        Future.successful(GetPartitionedTopicInternalStatsResponse(status = Some(status)))
