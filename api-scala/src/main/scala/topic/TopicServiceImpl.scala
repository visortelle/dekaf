package topic

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.topic.v1.topic as pb
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

class TopicServiceImpl extends pb.TopicServiceGrpc.TopicService:
    val logger: Logger = Logger(getClass.getName)

    override def createPartitionedTopic(request: pb.CreatePartitionedTopicRequest): Future[pb.CreatePartitionedTopicResponse] =
        logger.info(s"Creating partitioned topic ${request.topic}")

        try {
            adminClient.topics.createPartitionedTopic(request.topic, request.numPartitions, request.properties.asJava)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.CreatePartitionedTopicResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreatePartitionedTopicResponse(status = Some(status)))
        }

    override def createNonPartitionedTopic(request: pb.CreateNonPartitionedTopicRequest): Future[pb.CreateNonPartitionedTopicResponse] =
        logger.info(s"Creating non-partitioned topic ${request.topic}")

        try {
            adminClient.topics.createNonPartitionedTopic(request.topic, request.properties.asJava)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.CreateNonPartitionedTopicResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateNonPartitionedTopicResponse(status = Some(status)))
        }

    override def getTopics(request: pb.GetTopicsRequest): Future[pb.GetTopicsResponse] =
        logger.debug(s"Getting topics for namespace: ${request.namespace}")

        val topics = try {
            adminClient.topics.getList(request.namespace).asScala
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(pb.GetTopicsResponse(status = Some(status)))
        }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.GetTopicsResponse(status = Some(status), topics = topics.toSeq))


    override def getTopicsInternalStats(request: pb.GetTopicsInternalStatsRequest): Future[pb.GetTopicsInternalStatsResponse] =
        val stats: Map[String, pb.TopicInternalStats] = request.topics.flatMap { topic =>
            getTopicInternalStatsPb(topic) match
                case Right(ss: pb.PersistentTopicInternalStats) =>
                    val topicInternalStatsPb = pb.TopicInternalStats(stats = pb.TopicInternalStats.Stats.TopicStats(ss))
                    Some(topic, topicInternalStatsPb)
                case Right(ss: pb.PartitionedTopicInternalStats) =>
                    val topicInternalStatsPb =
                        pb.TopicInternalStats(stats = pb.TopicInternalStats.Stats.PartitionedTopicStats(ss))
                    Some(topic, topicInternalStatsPb)
                case _ => None
        }.toMap

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.GetTopicsInternalStatsResponse(status = Some(status), stats = stats))

    override def deleteTopic(request: pb.DeleteTopicRequest): Future[pb.DeleteTopicResponse] =
        logger.info(s"Deleting topic: ${request.topicName}")

        try {
            adminClient.topics.delete(request.topicName, request.force)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteTopicResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.DeleteTopicResponse(status = Some(status)))
        }
