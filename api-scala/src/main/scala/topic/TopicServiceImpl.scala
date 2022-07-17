package topic

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.api.v1.topic as topicPb
import com.tools.teal.pulsar.ui.api.v1.topic.{CursorStats, GetTopicsInternalStatsRequest, GetTopicsInternalStatsResponse, TopicServiceGrpc}
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}

class TopicServiceImpl extends TopicServiceGrpc.TopicService:
    val logger: Logger = Logger(getClass.getName)

    override def getTopicsInternalStats(request: GetTopicsInternalStatsRequest): Future[GetTopicsInternalStatsResponse] =
        val stats: Map[String, topicPb.TopicInternalStats] = request.topics.flatMap(topic => {
                getTopicInternalStatsPb(topic) match
                case Right(ss: topicPb.PersistentTopicInternalStats) =>
                    val topicInternalStatsPb = topicPb.TopicInternalStats(stats = topicPb.TopicInternalStats.Stats.TopicStats(ss))
                    Some(topic, topicInternalStatsPb)
                case Right(ss: topicPb.PartitionedTopicInternalStats) =>
                    val topicInternalStatsPb = topicPb.TopicInternalStats(stats = topicPb.TopicInternalStats.Stats.PartitionedTopicStats(ss))
                    Some(topic, topicInternalStatsPb)
                case _ => None
        }).toMap

        val status: Status = Status(code = Code.OK.index)
        Future.successful(GetTopicsInternalStatsResponse(status = Some(status),  stats = stats))
