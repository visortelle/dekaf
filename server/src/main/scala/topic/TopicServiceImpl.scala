package topic

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import api.LongRunningProcessStatus
import com.tools.teal.pulsar.ui.topic.v1.topic as pb
import com.typesafe.scalalogging.Logger

import scala.concurrent.{Await, ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.topic.v1.topic.{CreateMissedPartitionsRequest, CreateMissedPartitionsResponse, GetCompactionStatusRequest, GetCompactionStatusResponse, GetTopicPropertiesRequest, GetTopicPropertiesResponse, SetTopicPropertiesRequest, SetTopicPropertiesResponse, TopicProperties, TriggerCompactionRequest, TriggerCompactionResponse, UpdatePartitionedTopicRequest, UpdatePartitionedTopicResponse}

import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.Duration
import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}
import org.apache.pulsar.common.naming.TopicDomain
import org.apache.pulsar.client.admin.ListTopicsOptions
import pulsar_auth.RequestContext
import topic.TopicPartitioningType.NonPartitioned

import scala.util.{Failure, Success, Try}

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

    override def listTopics(request: pb.ListTopicsRequest): Future[pb.ListTopicsResponse] =
        logger.debug(s"List topics for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        val options = ListTopicsOptions.builder().includeSystemTopic(true).build()
        val topics =
            try
                request.topicDomain match
                    case pb.TopicDomain.TOPIC_DOMAIN_PERSISTENT =>
                        adminClient.topics.getList(request.namespace, TopicDomain.persistent, options).asScala.toVector
                    case pb.TopicDomain.TOPIC_DOMAIN_NON_PERSISTENT =>
                        adminClient.topics.getList(request.namespace, TopicDomain.non_persistent, options).asScala.toVector
                    case _ =>
                        val persistent = adminClient.topics.getList(request.namespace, TopicDomain.persistent, options).asScala.toVector
                        val nonPersistent = adminClient.topics.getList(request.namespace, TopicDomain.non_persistent, options).asScala.toVector
                        persistent ++ nonPersistent
            catch {
                case err: Throwable =>
                    val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                    return Future.successful(pb.ListTopicsResponse(status = Some(status)))
            }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.ListTopicsResponse(status = Some(status), topics = topics))

    override def listPartitionedTopics(request: pb.ListPartitionedTopicsRequest): Future[pb.ListPartitionedTopicsResponse] =
        logger.debug(s"List partitioned topics for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        val topics =
            try
                val options = ListTopicsOptions.builder().includeSystemTopic(true).build()
                adminClient.topics.getPartitionedTopicList(request.namespace, options)
            catch {
                case err: Throwable =>
                    val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                    return Future.successful(pb.ListPartitionedTopicsResponse(status = Some(status)))
            }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.ListPartitionedTopicsResponse(status = Some(status), topics = topics.asScala.toSeq))

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

        def deletePartitionedTopic(): Try[Unit] = Try(adminClient.topics.deletePartitionedTopic(request.topicName, request.force))

        def lookupPartitionedTopic(): Try[Unit] = Try(adminClient.lookups().lookupPartitionedTopic(request.topicName))

        def deleteNonPartitionedTopic(): Try[Unit] = Try(adminClient.topics.delete(request.topicName, request.force))

        def lookupNonPartitionedTopic(): Try[Unit] = Try(adminClient.lookups().lookupTopic(request.topicName))

        def handleSuccess(): Future[pb.DeleteTopicResponse] = {
            val status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteTopicResponse(status = Some(status)))
        }

        def handleFailure(err: Throwable): Future[pb.DeleteTopicResponse] = {
            val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
            Future.successful(pb.DeleteTopicResponse(status = Some(status)))
        }

        lookupPartitionedTopic() match
            case Success(_) =>
                deletePartitionedTopic() match
                    case Success(_)   => handleSuccess()
                    case Failure(err) => handleFailure(err)
            case Failure(exception) =>
                lookupNonPartitionedTopic() match
                    case Success(_) =>
                        deleteNonPartitionedTopic() match
                            case Success(_)   => handleSuccess()
                            case Failure(err) => handleFailure(err)
                    case Failure(err) => handleFailure(err)

    override def getTopicsStats(request: pb.GetTopicsStatsRequest): Future[pb.GetTopicsStatsResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        var errors: List[Throwable] = List.empty

        val topicsStatsMap: Map[String, org.apache.pulsar.common.policies.data.TopicStats] =
            try {
                val getTopicsStatsFutures = request.topics.map(t =>
                    adminClient.topics.getStatsAsync(t, request.isGetPreciseBacklog, request.isSubscriptionBacklogSize, request.isEarliestTimeInBacklog).asScala
                )
                val topicsStats = Await.result(Future.sequence(getTopicsStatsFutures), Duration(1, TimeUnit.MINUTES))
                request.topics.zip(topicsStats).toMap
            } catch {
                case err =>
                    errors = err :: errors
                    Map.empty
            }

        val partitionedTopicsStatsMap: Map[String, org.apache.pulsar.common.policies.data.PartitionedTopicStats] =
            try {
                val getPartitionedTopicsStatsFutures =
                    request.partitionedTopics.map(t =>
                        adminClient.topics.getPartitionedStatsAsync(
                            t,
                            request.isPerPartition,
                            request.isGetPreciseBacklog,
                            request.isSubscriptionBacklogSize,
                            request.isEarliestTimeInBacklog
                        ).asScala
                    )
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
            partitionedTopicStats = partitionedTopicsStatsMap.view.mapValues(partitionedTopicStatsToPb).toMap
        ))

    override def getTopicProperties(request: GetTopicPropertiesRequest): Future[GetTopicPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        try {
            val getTopicsPropertiesFutures = request.topics.map(adminClient.topics.getPropertiesAsync(_).asScala)
            val topicsProperties = Await
                .result(Future.sequence(getTopicsPropertiesFutures), Duration(1, TimeUnit.MINUTES))
                .map(properties => Option(properties.asScala).map(_.toMap))

            val prop = request.topics
                .zip(topicsProperties)
                .toMap
                .view
                .mapValues(map => TopicProperties(map.getOrElse(Map())))
                .toMap

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.GetTopicPropertiesResponse(
                status = Some(status),
                topicProperties = prop
            ))
        } catch {
            case err: Throwable =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetTopicPropertiesResponse(status = Some(status)))
        }

    override def setTopicProperties(request: SetTopicPropertiesRequest): Future[SetTopicPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.topics.updateProperties(request.topic, request.topicProperties.asJava)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.SetTopicPropertiesResponse(
                status = Some(status)
            ))
        } catch {
            case err: Throwable =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetTopicPropertiesResponse(status = Some(status)))
        }

    override def getIsPartitionedTopic(request: pb.GetIsPartitionedTopicRequest): Future[pb.GetIsPartitionedTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(_root_.topic.getTopicPartitioning(adminClient, request.topicFqn)) match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetIsPartitionedTopicResponse(status = Some(status)))
            case Success(partitioning: TopicPartitioning) =>
                val isPartitioned = partitioning.`type` == TopicPartitioningType.Partitioned
                val status: Status = Status(code = Code.OK.index)

                Future.successful(pb.GetIsPartitionedTopicResponse(
                    status = Some(status),
                    isPartitioned = isPartitioned,
                    partitionsCount = partitioning.partitionsCount,
                    activePartitionsCount = partitioning.activePartitionsCount
                ))

    override def updatePartitionedTopic(request: UpdatePartitionedTopicRequest): Future[UpdatePartitionedTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(adminClient.topics.updatePartitionedTopic(request.topicFqn, request.numPartitions, request.updateLocalTopicOnly, request.force)) match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.UpdatePartitionedTopicResponse(status = Some(status)))
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.UpdatePartitionedTopicResponse(status = Some(status)))

    override def createMissedPartitions(request: CreateMissedPartitionsRequest): Future[CreateMissedPartitionsResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(adminClient.topics.createMissedPartitions(request.topicFqn)) match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateMissedPartitionsResponse(status = Some(status)))
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.CreateMissedPartitionsResponse(status = Some(status)))

    override def getCompactionStatus(request: GetCompactionStatusRequest): Future[GetCompactionStatusResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(adminClient.topics.compactionStatus(request.topicFqn)) match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetCompactionStatusResponse(status = Some(status)))
            case Success(lrps) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.GetCompactionStatusResponse(
                    status = Some(status),
                    processStatus = Some(LongRunningProcessStatus.toPb(lrps))
                ))

    override def triggerCompaction(request: TriggerCompactionRequest): Future[TriggerCompactionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(adminClient.topics.triggerCompaction(request.topicFqn)) match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.TriggerCompactionResponse(status = Some(status)))
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.TriggerCompactionResponse(status = Some(status)))
