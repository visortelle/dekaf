package topic

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.topic.v1.topic as pb
import com.typesafe.scalalogging.Logger

import scala.concurrent.{Await, ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.Duration
import com.tools.teal.pulsar.ui.topic.v1.topic.{
    GetPartitionedTopicStatsRequest,
    GetPartitionedTopicStatsResponse,
    GetTopicsStatsRequest,
    GetTopicsStatsResponse,
    GetTopicStatsRequest,
    GetTopicStatsResponse
}
import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}
import org.apache.pulsar.common.naming.TopicDomain
import pulsar_auth.RequestContext

class TopicServiceImpl extends pb.TopicServiceGrpc.TopicService:
    val logger: Logger = Logger(getClass.getName)

    override def createPartitionedTopic(request: pb.CreatePartitionedTopicRequest): Future[pb.CreatePartitionedTopicResponse] =
        logger.info(s"Creating partitioned topic ${request.topic}")
        val adminClient = RequestContext.pulsarAdmin.get()

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
        val adminClient = RequestContext.pulsarAdmin.get()

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
        val adminClient = RequestContext.pulsarAdmin.get()

        val topics =
            try
                request.topicDomain match
                    case pb.TopicDomain.TOPIC_DOMAIN_PERSISTENT =>
                        adminClient.topics.getList(request.namespace, TopicDomain.persistent)
                    case pb.TopicDomain.TOPIC_DOMAIN_NON_PERSISTENT =>
                        adminClient.topics.getList(request.namespace, TopicDomain.non_persistent)
                    case _ =>
                        adminClient.topics.getList(request.namespace)
            catch {
                case err =>
                    val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                    return Future.successful(pb.GetTopicsResponse(status = Some(status)))
            }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.GetTopicsResponse(status = Some(status), topics = topics.asScala.toSeq))

    override def getTopicsInternalStats(request: pb.GetTopicsInternalStatsRequest): Future[pb.GetTopicsInternalStatsResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        val stats: Map[String, pb.TopicInternalStats] = request.topics.flatMap { topic =>
            getTopicInternalStatsPb(adminClient, topic) match
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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.topics.delete(request.topicName, request.force)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteTopicResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.DeleteTopicResponse(status = Some(status)))
        }

    override def getTopicsStats(request: GetTopicsStatsRequest): Future[GetTopicsStatsResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        var errors: List[Throwable] = List.empty

        val topicsStatsMap: Map[String, org.apache.pulsar.common.policies.data.TopicStats] = try {
            val getTopicsStatsFutures = request.topics.map(t => adminClient.topics.getStatsAsync(t, request.isGetPreciseBacklog, request.isSubscriptionBacklogSize, request.isEarliestTimeInBacklog).asScala)
            val topicsStats = Await.result(Future.sequence(getTopicsStatsFutures), Duration(1, TimeUnit.MINUTES))
            request.topics.zip(topicsStats).toMap
        } catch {
            case err =>
                errors = err :: errors
                Map.empty
        }

        val partitionedTopicsStatsMap: Map[String, org.apache.pulsar.common.policies.data.PartitionedTopicStats] = try {
            val getPartitionedTopicsStatsFutures =
                request.partitionedTopics.map(t => adminClient.topics.getPartitionedStatsAsync(t, request.isPerPartition, request.isGetPreciseBacklog, request.isSubscriptionBacklogSize, request.isEarliestTimeInBacklog).asScala)
            val partitionedTopicsStats = Await.result(Future.sequence(getPartitionedTopicsStatsFutures), Duration(1, TimeUnit.MINUTES))
            request.partitionedTopics.zip(partitionedTopicsStats).toMap
        } catch {
            case err =>
                errors = err :: errors
                Map.empty
        }

        // This RPC method always returns Code.OK because in case we request stats for a single topic,
        // we want to avoid additional API calls to detect is topic partitioned or not.
        val status: Status = Status(code = Code.OK.index, message = errors.map(_.getMessage).mkString(". "))
            Future.successful(pb.GetTopicsStatsResponse(
                status = Some(status),
                topicStats = topicsStatsMap.view.mapValues(topicStatsToPb).toMap,
                partitionedTopicStats = partitionedTopicsStatsMap.view.mapValues(partitionedTopicStatsToPb).toMap,
            ))
