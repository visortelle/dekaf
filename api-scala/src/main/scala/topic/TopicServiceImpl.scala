package topic

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.topic.v1.topic as topicPb
import com.tools.teal.pulsar.ui.topic.v1.topic.{CreateNonPartitionedTopicRequest, CreateNonPartitionedTopicResponse, CreatePartitionedTopicRequest, CreatePartitionedTopicResponse, CursorStats, DeleteTopicRequest, DeleteTopicResponse, GetTopicsInternalStatsRequest, GetTopicsInternalStatsResponse, TopicServiceGrpc}
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.tenant.v1.tenant.{CreateTenantResponse, DeleteTenantResponse}
import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}

class TopicServiceImpl extends TopicServiceGrpc.TopicService:
    val logger: Logger = Logger(getClass.getName)

    override def createPartitionedTopic(request: CreatePartitionedTopicRequest): Future[CreatePartitionedTopicResponse] =
        logger.info(s"Creating partitioned topic ${request.topic}")

        try {
            adminClient.topics.createPartitionedTopic(request.topic, request.numPartitions, request.properties.asJava)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreatePartitionedTopicResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreatePartitionedTopicResponse(status = Some(status)))
        }

    override def createNonPartitionedTopic(request: CreateNonPartitionedTopicRequest): Future[CreateNonPartitionedTopicResponse] =
        logger.info(s"Creating non-partitioned topic ${request.topic}")

        try {
            adminClient.topics.createNonPartitionedTopic(request.topic, request.properties.asJava)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreateNonPartitionedTopicResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateNonPartitionedTopicResponse(status = Some(status)))
        }

    override def getTopicsInternalStats(request: GetTopicsInternalStatsRequest): Future[GetTopicsInternalStatsResponse] =
        val stats: Map[String, topicPb.TopicInternalStats] = request.topics.flatMap { topic =>
            getTopicInternalStatsPb(topic) match
                case Right(ss: topicPb.PersistentTopicInternalStats) =>
                    val topicInternalStatsPb = topicPb.TopicInternalStats(stats = topicPb.TopicInternalStats.Stats.TopicStats(ss))
                    Some(topic, topicInternalStatsPb)
                case Right(ss: topicPb.PartitionedTopicInternalStats) =>
                    val topicInternalStatsPb =
                        topicPb.TopicInternalStats(stats = topicPb.TopicInternalStats.Stats.PartitionedTopicStats(ss))
                    Some(topic, topicInternalStatsPb)
                case _ => None
        }.toMap

        val status: Status = Status(code = Code.OK.index)
        Future.successful(GetTopicsInternalStatsResponse(status = Some(status), stats = stats))

    override def deleteTopic(request: DeleteTopicRequest): Future[DeleteTopicResponse] =
        logger.info(s"Deleting topic topic ${request.topicName}")

        try {
            adminClient.topics.delete(request.topicName, request.force)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(DeleteTopicResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteTopicResponse(status = Some(status)))
        }
