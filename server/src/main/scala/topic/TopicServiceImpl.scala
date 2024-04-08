package topic

import api.LongRunningProcessStatus
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.topic.v1.topic as pb
import com.tools.teal.pulsar.ui.topic.v1.topic.*
import com.tools.teal.pulsar.ui.topic.v1.topic.ExpireMessagesRequest.ExpirationTarget
import com.tools.teal.pulsar.ui.topic.v1.topic.ExpireMessagesSubscription.ExpirationTarget
import com.tools.teal.pulsar.ui.topic.v1.topic.SkipSubscriptionMessagesRequest.SkipTarget
import com.typesafe.scalalogging.Logger
import consumer.start_from.MessageId
import org.apache.pulsar.client.admin.ListTopicsOptions
import org.apache.pulsar.client.api.MessageId as PulsarMessageId
import org.apache.pulsar.common.naming.TopicDomain
import pulsar_auth.RequestContext

import java.util.concurrent.TimeUnit
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
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
            Try:
                val getTopicsStatsFutures = request.topics.map(topic =>
                    adminClient.topics.getStatsAsync(
                        topic,
                        request.isGetPreciseBacklog,
                        request.isSubscriptionBacklogSize,
                        request.isEarliestTimeInBacklog
                    ).asScala
                )
                val topicsStats = Await.result(
                    Future.sequence(getTopicsStatsFutures),
                    Duration(1, TimeUnit.MINUTES)
                )

                request.topics.zip(topicsStats).toMap
            match
                case Failure(err) =>
                    errors = err :: errors
                    Map.empty
                case Success(value) =>
                    value

        val partitionedTopicsStatsMap: Map[String, org.apache.pulsar.common.policies.data.PartitionedTopicStats] =
            Try:
                val getPartitionedTopicsStatsFutures = request.partitionedTopics.map(topic =>
                    adminClient.topics.getPartitionedStatsAsync(
                        topic,
                        request.isPerPartition,
                        request.isGetPreciseBacklog,
                        request.isSubscriptionBacklogSize,
                        request.isEarliestTimeInBacklog
                    ).asScala
                )
                val partitionedTopicsStats = Await.result(
                    Future.sequence(getPartitionedTopicsStatsFutures),
                    Duration(1, TimeUnit.MINUTES)
                )

                request.partitionedTopics.zip(partitionedTopicsStats).toMap
            match
                case Failure(err) =>
                    errors = err :: errors
                    Map.empty
                case Success(value) =>
                    value

        // This RPC method always returns Code.OK because in case we request stats for a single topic,
        // we want to avoid additional API calls to detect is topic partitioned or not.
        val status: Status = Status(code = Code.OK.index, message = errors.map(_.getMessage).mkString(". "))

        Future.successful(pb.GetTopicsStatsResponse(
            status = Some(status),
            topicStats = topicsStatsMap.view.mapValues(topicStatsToPb).toMap,
            partitionedTopicStats = partitionedTopicsStatsMap.view.mapValues(partitionedTopicStatsToPb).toMap
        ))

    override def getTopicsProperties(request: GetTopicsPropertiesRequest): Future[GetTopicsPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        Try:
            val getTopicsPropertiesFutures = request.topics.map(adminClient.topics.getPropertiesAsync(_).asScala)
            val topicsProperties = Await
                .result(Future.sequence(getTopicsPropertiesFutures), Duration(1, TimeUnit.MINUTES))
                .map(properties => Option(properties.asScala).map(_.toMap))

            request.topics
                .zip(topicsProperties)
                .toMap
                .view
                .mapValues(map => TopicProperties(map.getOrElse(Map())))
                .toMap

        match
            case Failure(err) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetTopicsPropertiesResponse(status = Some(status)))
            case Success(properties) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.GetTopicsPropertiesResponse(
                    status = Some(status),
                    topicsProperties = properties
                ))

    override def setTopicProperties(request: SetTopicPropertiesRequest): Future[SetTopicPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try:
            val oldProperties = Option(adminClient.topics.getProperties(request.topic))
                .map(_.asScala)
                .getOrElse(Map.empty)
            val newProperties = request.topicProperties

            val propertiesToRemove = oldProperties.keys.toSet.diff(newProperties.keys.toSet)

            propertiesToRemove.foreach(key => adminClient.topics.removeProperties(request.topic, key))

            adminClient.topics.updateProperties(request.topic, request.topicProperties.asJava)
        match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetTopicPropertiesResponse(status = Some(status)))
            case Success(value) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.SetTopicPropertiesResponse(
                    status = Some(status)
                ))

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

    override def deleteSubscription(request: DeleteSubscriptionRequest): Future[DeleteSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(adminClient.topics.deleteSubscription(request.topicFqn, request.subscriptionName, request.isForce)) match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.DeleteSubscriptionResponse(status = Some(status)))
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.DeleteSubscriptionResponse(status = Some(status)))

    override def createSubscription(request: CreateSubscriptionRequest): Future[CreateSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        val messageId = request.initialCursorPosition match
            case pb.CreateSubscriptionRequest.InitialCursorPosition.Empty =>
                PulsarMessageId.earliest
            case pb.CreateSubscriptionRequest.InitialCursorPosition.MessageId(value) =>
                val messageId = MessageId.fromPb(value)

                PulsarMessageId.fromByteArray(messageId.messageIdBytes)
            case pb.CreateSubscriptionRequest.InitialCursorPosition.EarliestMessage(_) =>
                PulsarMessageId.earliest
            case pb.CreateSubscriptionRequest.InitialCursorPosition.LatestMessage(_) =>
                PulsarMessageId.latest

        Try:
            adminClient.topics.createSubscription(
                request.topicFqn,
                request.subscriptionName,
                messageId,
                request.isReplicated,
                request.properties.asJava
            )
        match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateSubscriptionResponse(status = Some(status)))
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.CreateSubscriptionResponse(status = Some(status)))

    override def expireMessages(request: ExpireMessagesRequest): Future[ExpireMessagesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try:
            request.expirationTarget match
                case pb.ExpireMessagesRequest.ExpirationTarget.ExpireSubscription(expireSubscription) =>
                    val expireSubscription = request.expirationTarget.expireSubscription.get

                    expireSubscription.expirationTarget match
                        case pb.ExpireMessagesSubscription.ExpirationTarget.ExpireByMessageId(expireByMessageId) =>
                            val messageId: PulsarMessageId = expireByMessageId.messageId.flatMap(messageIdPb =>
                                MessageId.toPulsar(MessageId.fromPb(messageIdPb))
                            ).getOrElse(throw RuntimeException(s"Failed to parse message ID (is message ID correct?)."))

                            adminClient.topics().expireMessages(
                                request.topicFqn,
                                expireSubscription.subscriptionName,
                                messageId,
                                expireByMessageId.isExcluded
                            )
                        case pb.ExpireMessagesSubscription.ExpirationTarget.TimeInSeconds(timeInSeconds) =>
                            adminClient.topics().expireMessages(
                                request.topicFqn,
                                expireSubscription.subscriptionName,
                                timeInSeconds
                            )
                        case pb.ExpireMessagesSubscription.ExpirationTarget.Empty =>
                            throw RuntimeException("Empty expire messages on subscription target (should be either message ID or time in seconds")
                case pb.ExpireMessagesRequest.ExpirationTarget.ExpireAllSubscriptions(expireAllSubscriptions) =>
                    val expireByTimeInSeconds: Option[Long] = request.expirationTarget.expireAllSubscriptions.flatMap(expireAllSubscriptions =>
                        expireAllSubscriptions.timeInSeconds
                    )

                    expireByTimeInSeconds.foreach { expireByTimeInSeconds =>
                        adminClient.topics().expireMessagesForAllSubscriptions(request.topicFqn, expireByTimeInSeconds)
                    }
                case pb.ExpireMessagesRequest.ExpirationTarget.Empty =>
                    throw RuntimeException("Empty expire messages target (should be either expire of all subscriptions or on a specific one)")
        match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.ExpireMessagesResponse(status = Some(status)))
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.ExpireMessagesResponse(status = Some(status)))

    override def skipSubscriptionMessages(request: SkipSubscriptionMessagesRequest): Future[SkipSubscriptionMessagesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try:
            request.skipTarget match
                case SkipTarget.SkipExactNumberMessages(skipExactNumberMessages) =>
                    skipExactNumberMessages.numberOfMessages.foreach { numberOfMessages =>
                        adminClient.topics().skipMessages(request.topicFqn, request.subscriptionName, numberOfMessages)
                    }
                case SkipTarget.SkipAllMessages(_) =>
                    adminClient.topics().skipAllMessages(request.topicFqn, request.subscriptionName)
                case SkipTarget.Empty =>
                    throw RuntimeException("Empty skip messages target (should be either skip of all messages or exact number of messages)")
        match
            case Failure(err: Throwable) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SkipSubscriptionMessagesResponse(status = Some(status)))
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(pb.SkipSubscriptionMessagesResponse(status = Some(status)))

    override def resetCursor(request: ResetCursorRequest): Future[ResetCursorResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try:
            request.resetCursorTarget match
                case ResetCursorRequest.ResetCursorTarget.Empty =>
                    throw RuntimeException("Empty reset cursor target (should be either reset to earliest or latest message)")
                case ResetCursorRequest.ResetCursorTarget.ResetByMessageId(resetByMessageId) =>
                    val messageId: PulsarMessageId = resetByMessageId.messageId.flatMap(messageIdPb =>
                        MessageId.toPulsar(MessageId.fromPb(messageIdPb))
                    ).getOrElse(throw RuntimeException(s"Failed to parse message ID (is message ID correct?)."))

                    adminClient.topics().resetCursor(request.topicFqn, request.subscriptionName, messageId, resetByMessageId.isExcluded)
                case ResetCursorRequest.ResetCursorTarget.Timestamp(timestamp) =>
                    adminClient.topics().resetCursor(request.topicFqn, request.subscriptionName, timestamp)
        match
            case Failure(err: Throwable) =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ResetCursorResponse(status = Some(status)))
            case Success(_) =>
                val status = Status(code = Code.OK.index)
                Future.successful(ResetCursorResponse(status = Some(status)))

    override def getSubscriptionStats(request: GetSubscriptionStatsRequest): Future[GetSubscriptionStatsResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try:
            if request.isPartitionedTopic then
                val partitionedTopicStats = adminClient.topics().getPartitionedStats(
                    request.topicFqn,
                    false,
                    request.isGetPreciseBacklog,
                    request.isSubscriptionBacklogSize,
                    request.isEarliestTimeInBacklog
                )

                partitionedTopicStats.getSubscriptions.get(request.subscriptionName)
            else
                val topicStats = adminClient.topics().getStats(
                    request.topicFqn,
                    request.isGetPreciseBacklog,
                    request.isSubscriptionBacklogSize,
                    request.isEarliestTimeInBacklog
                )

                topicStats.getSubscriptions.get(request.subscriptionName)
        match
            case Failure(err: Throwable) =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscriptionStatsResponse(status = Some(status)))
            case Success(subscriptionStats) =>
                val status = Status(code = Code.OK.index)
                Future.successful(GetSubscriptionStatsResponse(
                    status = Some(status),
                    subscriptionStats = Some(subscriptionStatsToPb(subscriptionStats))
                ))

    override def getSubscriptionProperties(request: GetSubscriptionPropertiesRequest): Future[GetSubscriptionPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(adminClient.topics().getSubscriptionProperties(request.topicFqn, request.subscriptionName)) match
            case Failure(err: Throwable) =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscriptionPropertiesResponse(status = Some(status)))
            case Success(properties) =>
                val status = Status(code = Code.OK.index)
                Future.successful(GetSubscriptionPropertiesResponse(
                    status = Some(status),
                    properties = properties.asScala.toMap
                ))


    override def setSubscriptionProperties(request: SetSubscriptionPropertiesRequest): Future[SetSubscriptionPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try(adminClient.topics().updateSubscriptionProperties(request.topicFqn, request.subscriptionName, request.properties.asJava)) match
            case Failure(err: Throwable) =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscriptionPropertiesResponse(status = Some(status)))
            case Success(_) =>
                val status = Status(code = Code.OK.index)
                Future.successful(SetSubscriptionPropertiesResponse(status = Some(status)))
