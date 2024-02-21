package topic_policies

import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.topic_policies.v1.topic_policies as pb
import com.tools.teal.pulsar.ui.topic_policies.v1.topic_policies.*
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.policies.data.BacklogQuota.{BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder}
import org.apache.pulsar.common.policies.data.*
import pulsar_auth.RequestContext

import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class TopicPoliciesServiceImpl extends TopicPoliciesServiceGrpc.TopicPoliciesService:
    val logger: Logger = Logger(getClass.getName)

    override def getBacklogQuotas(request: GetBacklogQuotasRequest): Future[GetBacklogQuotasResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def retentionPolicyToPb(policy: Option[RetentionPolicy]): Option[pb.BacklogQuotaRetentionPolicy] = policy match
            case Some(RetentionPolicy.consumer_backlog_eviction) =>
                Some(pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION)
            case Some(RetentionPolicy.producer_request_hold) =>
                Some(pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_REQUEST_HOLD)
            case Some(RetentionPolicy.producer_exception) =>
                Some(pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_EXCEPTION)
            case _ => None

        try {
            val backlogQuotaMap = adminClient.topicPolicies(request.isGlobal).getBacklogQuotaMap(request.topic, false).asScala.toMap
            val destinationStorageBacklogQuotaPb = backlogQuotaMap.get(BacklogQuotaType.destination_storage) match
                case Some(quota) =>
                    Some(
                        pb.DestinationStorageBacklogQuota(
                            limitSize = Option(quota.getLimitSize).getOrElse(-1),
                            retentionPolicy = retentionPolicyToPb(Option(quota.getPolicy)),
                        )
                    )
                case _ => None

            val messageAgeBacklogQuotaPb = backlogQuotaMap.get(BacklogQuotaType.message_age) match
                case Some(quota) =>
                    Some(
                        pb.MessageAgeBacklogQuota(
                            limitTime = Option(quota.getLimitTime).getOrElse(-1),
                            retentionPolicy = retentionPolicyToPb(Option(quota.getPolicy))
                        )
                    )
                case _ => None

            Future.successful(
                GetBacklogQuotasResponse(
                    status = Some(Status(code = Code.OK.index)),
                    destinationStorage = destinationStorageBacklogQuotaPb,
                    messageAge = messageAgeBacklogQuotaPb,
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetBacklogQuotasResponse(status = Some(status)))
        }
    override def setBacklogQuotas(request: SetBacklogQuotasRequest): Future[SetBacklogQuotasResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def retentionPolicyFromPb(policyPb: pb.BacklogQuotaRetentionPolicy): RetentionPolicy = policyPb match
            case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION =>
                RetentionPolicy.consumer_backlog_eviction
            case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_REQUEST_HOLD =>
                RetentionPolicy.producer_request_hold
            case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_EXCEPTION =>
                RetentionPolicy.producer_exception
            case _ => RetentionPolicy.producer_request_hold

        try {
            request.destinationStorage match
                case Some(quotaPb) =>
                    var backlogQuotaBuilder = BacklogQuotaBuilder.limitSize(quotaPb.limitSize)

                    quotaPb.retentionPolicy match
                        case Some(retentionPolicy) =>
                            backlogQuotaBuilder = backlogQuotaBuilder.retentionPolicy(retentionPolicyFromPb(retentionPolicy))
                        case _ =>

                    val backlogQuota = backlogQuotaBuilder.build

                    logger.info(s"Setting backlog quota policy (destination storage) on topic ${request.topic} to $backlogQuota")
                    adminClient.topicPolicies(request.isGlobal).setBacklogQuota(request.topic, backlogQuota, BacklogQuotaType.destination_storage)
                case None =>

            request.messageAge match
                case Some(quotaPb) =>
                    var backlogQuotaBuilder = BacklogQuotaBuilder.limitTime(quotaPb.limitTime)

                    quotaPb.retentionPolicy match
                        case Some(retentionPolicy) =>
                            backlogQuotaBuilder = backlogQuotaBuilder.retentionPolicy(retentionPolicyFromPb(retentionPolicy))
                        case _ =>

                    val backlogQuota = backlogQuotaBuilder.build

                    logger.info(s"Setting backlog quota (message age) on topic ${request.topic} to $backlogQuota")
                    adminClient.topicPolicies(request.isGlobal).setBacklogQuota(request.topic, backlogQuota, BacklogQuotaType.message_age)
                case None =>

            Future.successful(SetBacklogQuotasResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetBacklogQuotasResponse(status = Some(status)))
        }
    override def removeBacklogQuota(request: RemoveBacklogQuotaRequest): Future[RemoveBacklogQuotaResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            request.backlogQuotaType match
                case pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_DESTINATION_STORAGE =>
                    logger.info(s"Removing backlog quota (destination storage) on topic ${request.topic}")
                    adminClient.topicPolicies(request.isGlobal).removeBacklogQuota(request.topic, BacklogQuotaType.destination_storage)
                case pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_MESSAGE_AGE =>
                    logger.info(s"Removing backlog quota (message age) on topic ${request.topic}")
                    adminClient.topicPolicies(request.isGlobal).removeBacklogQuota(request.topic, BacklogQuotaType.message_age)
                case _ =>
                    val status = Status(code = Code.INVALID_ARGUMENT.index, message = "Backlog quota type should be specified")
                    return Future.successful(RemoveBacklogQuotaResponse(status = Some(status)))

            Future.successful(RemoveBacklogQuotaResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveBacklogQuotaResponse(status = Some(status)))
        }
    override def getDelayedDelivery(request: GetDelayedDeliveryRequest): Future[GetDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val delayedDeliveryPb = Option(adminClient.topicPolicies(request.isGlobal).getDelayedDeliveryPolicy(request.topic, false)) match
                case None =>
                    pb.GetDelayedDeliveryResponse.DelayedDelivery.Unspecified(new DelayedDeliveryUnspecified())
                case Some(v) =>
                    pb.GetDelayedDeliveryResponse.DelayedDelivery.Specified(new DelayedDeliverySpecified(
                        enabled = Option(v.isActive).getOrElse(false),
                        tickTimeMs = Option(v.getTickTime).getOrElse(0)
                    ))

            Future.successful(GetDelayedDeliveryResponse(
                status = Some(Status(code = Code.OK.index)),
                delayedDelivery = delayedDeliveryPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDelayedDeliveryResponse(status = Some(status)))
        }
    override def setDelayedDelivery(request: SetDelayedDeliveryRequest): Future[SetDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting delayed delivery policy for topic ${request.topic}")
            val delayedDeliveryPolicies = DelayedDeliveryPolicies.builder
                .active(request.enabled)
                .tickTime(request.tickTimeMs)
                .build()

            adminClient.topicPolicies(request.isGlobal).setDelayedDeliveryPolicy(request.topic, delayedDeliveryPolicies)
            Future.successful(SetDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDelayedDeliveryResponse(status = Some(status)))
        }
    override def removeDelayedDelivery(request: RemoveDelayedDeliveryRequest): Future[RemoveDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing delayed delivery policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDelayedDeliveryPolicy(request.topic)
            Future.successful(RemoveDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDelayedDeliveryResponse(status = Some(status)))
        }
    override def getMessageTtl(request: GetMessageTtlRequest): Future[GetMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val messageTtlPb = Option(adminClient.topicPolicies(request.isGlobal).getMessageTTL(request.topic, false)) match
                case None =>
                    pb.GetMessageTtlResponse.MessageTtl.Unspecified(new MessageTtlUnspecified())
                case Some(v) =>
                    pb.GetMessageTtlResponse.MessageTtl.Specified(new MessageTtlSpecified(
                        messageTtlSeconds = v
                    ))

            Future.successful(GetMessageTtlResponse(
                status = Some(Status(code = Code.OK.index)),
                messageTtl = messageTtlPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMessageTtlResponse(status = Some(status)))
        }
    override def setMessageTtl(request: SetMessageTtlRequest): Future[SetMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting message TTL policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMessageTTL(request.topic, request.messageTtlSeconds)
            Future.successful(SetMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMessageTtlResponse(status = Some(status)))
        }
    override def removeMessageTtl(request: RemoveMessageTtlRequest): Future[RemoveMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing message TTL policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMessageTTL(request.topic)
            Future.successful(RemoveMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMessageTtlResponse(status = Some(status)))
        }
    override def getRetention(request: GetRetentionRequest): Future[GetRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val retentionPb = Option(adminClient.topicPolicies(request.isGlobal).getRetention(request.topic, false)) match
                case None =>
                    pb.GetRetentionResponse.Retention.Unspecified(new RetentionUnspecified())
                case Some(v) =>
                    pb.GetRetentionResponse.Retention.Specified(new RetentionSpecified(
                        retentionTimeInMinutes = Option(v.getRetentionTimeInMinutes).getOrElse(0),
                        retentionSizeInMb = Option(v.getRetentionSizeInMB).map(_.toInt).getOrElse(0)
                    ))

            Future.successful(GetRetentionResponse(
                status = Some(Status(code = Code.OK.index)),
                retention = retentionPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetRetentionResponse(status = Some(status)))
        }
    override def setRetention(request: SetRetentionRequest): Future[SetRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting retention for topic ${request.topic}")
            val retention = new RetentionPolicies(request.retentionTimeInMinutes, request.retentionSizeInMb)

            adminClient.topicPolicies(request.isGlobal).setRetention(request.topic, retention)
            Future.successful(SetRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetRetentionResponse(status = Some(status)))
        }
    override def removeRetention(request: RemoveRetentionRequest): Future[RemoveRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing retention for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeRetention(request.topic)
            Future.successful(RemoveRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveRetentionResponse(status = Some(status)))
        }
    override def getMaxUnackedMessagesOnConsumer(request: GetMaxUnackedMessagesOnConsumerRequest): Future[GetMaxUnackedMessagesOnConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxUnackedMessagesOnConsumerPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxUnackedMessagesOnConsumer(request.topic, false)) match
                case None =>
                    pb.GetMaxUnackedMessagesOnConsumerResponse.MaxUnackedMessagesOnConsumer.Unspecified(new MaxUnackedMessagesOnConsumerUnspecified())
                case Some(v) =>
                    pb.GetMaxUnackedMessagesOnConsumerResponse.MaxUnackedMessagesOnConsumer.Specified(new MaxUnackedMessagesOnConsumerSpecified(
                        maxUnackedMessagesOnConsumer = v
                    ))

            Future.successful(GetMaxUnackedMessagesOnConsumerResponse(
                status = Some(Status(code = Code.OK.index)),
                maxUnackedMessagesOnConsumer = maxUnackedMessagesOnConsumerPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }
    override def setMaxUnackedMessagesOnConsumer(request: SetMaxUnackedMessagesOnConsumerRequest): Future[SetMaxUnackedMessagesOnConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max unacked messages on consumer policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxUnackedMessagesOnConsumer(request.topic, request.maxUnackedMessagesOnConsumer)
            Future.successful(SetMaxUnackedMessagesOnConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }

    override def removeMaxUnackedMessagesOnConsumer(request: RemoveMaxUnackedMessagesOnConsumerRequest): Future[RemoveMaxUnackedMessagesOnConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max unacked messages on consumer policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxUnackedMessagesOnConsumer(request.topic)
            Future.successful(RemoveMaxUnackedMessagesOnConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }
    override def getMaxUnackedMessagesOnSubscription(request: GetMaxUnackedMessagesOnSubscriptionRequest): Future[GetMaxUnackedMessagesOnSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxUnackedMessagesOnSubscriptionPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxUnackedMessagesOnSubscription(request.topic, false)) match
                case None =>
                    pb.GetMaxUnackedMessagesOnSubscriptionResponse.MaxUnackedMessagesOnSubscription.Unspecified(new MaxUnackedMessagesOnSubscriptionUnspecified())
                case Some(v) =>
                    pb.GetMaxUnackedMessagesOnSubscriptionResponse.MaxUnackedMessagesOnSubscription.Specified(new MaxUnackedMessagesOnSubscriptionSpecified(
                        maxUnackedMessagesOnSubscription = v
                    ))

            Future.successful(GetMaxUnackedMessagesOnSubscriptionResponse(
                status = Some(Status(code = Code.OK.index)),
                maxUnackedMessagesOnSubscription = maxUnackedMessagesOnSubscriptionPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def setMaxUnackedMessagesOnSubscription(request: SetMaxUnackedMessagesOnSubscriptionRequest): Future[SetMaxUnackedMessagesOnSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max unacked messages on subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxUnackedMessagesOnSubscription(request.topic, request.maxUnackedMessagesOnSubscription)
            Future.successful(SetMaxUnackedMessagesOnSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def removeMaxUnackedMessagesOnSubscription(request: RemoveMaxUnackedMessagesOnSubscriptionRequest): Future[RemoveMaxUnackedMessagesOnSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max unacked messages on subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxUnackedMessagesOnSubscription(request.topic)
            Future.successful(RemoveMaxUnackedMessagesOnSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def getInactiveTopicPolicies(request: GetInactiveTopicPoliciesRequest): Future[GetInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val inactiveTopicPoliciesPb = Option(adminClient.topicPolicies(request.isGlobal).getInactiveTopicPolicies(request.topic, false)) match
                case None =>
                    pb.GetInactiveTopicPoliciesResponse.InactiveTopicPolicies.Unspecified(InactiveTopicPoliciesUnspecified())
                case Some(v) =>
                    pb.GetInactiveTopicPoliciesResponse.InactiveTopicPolicies.Specified(InactiveTopicPoliciesSpecified(
                        inactiveTopicDeleteMode = v.getInactiveTopicDeleteMode match
                            case InactiveTopicDeleteMode.delete_when_no_subscriptions =>
                                InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS
                            case InactiveTopicDeleteMode.delete_when_subscriptions_caught_up =>
                                InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP
                        ,
                        maxInactiveDurationSeconds = v.getMaxInactiveDurationSeconds,
                        deleteWhileInactive = v.isDeleteWhileInactive
                    ))

            Future.successful(GetInactiveTopicPoliciesResponse(
                status = Some(Status(code = Code.OK.index)),
                inactiveTopicPolicies = inactiveTopicPoliciesPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def setInactiveTopicPolicies(request: SetInactiveTopicPoliciesRequest): Future[SetInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting inactive topic policies for topic ${request.topic}")

            val inactiveTopicPolicies = new InactiveTopicPolicies()
            inactiveTopicPolicies.setDeleteWhileInactive(request.deleteWhileInactive)
            inactiveTopicPolicies.setMaxInactiveDurationSeconds(request.maxInactiveDurationSeconds)

            request.inactiveTopicDeleteMode match
                case InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS =>
                    inactiveTopicPolicies.setInactiveTopicDeleteMode(InactiveTopicDeleteMode.delete_when_no_subscriptions)
                case InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP =>
                    inactiveTopicPolicies.setInactiveTopicDeleteMode(InactiveTopicDeleteMode.delete_when_subscriptions_caught_up)
                case _ =>
                    throw new IllegalArgumentException("InactiveTopicPoliciesDeleteMode should be specified.")

            adminClient.topicPolicies(request.isGlobal).setInactiveTopicPolicies(request.topic, inactiveTopicPolicies)
            Future.successful(SetInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def removeInactiveTopicPolicies(request: RemoveInactiveTopicPoliciesRequest): Future[RemoveInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing inactive topic policies for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeInactiveTopicPolicies(request.topic)
            Future.successful(RemoveInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def getPersistence(request: GetPersistenceRequest): Future[GetPersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val persistencePb = Option(adminClient.topicPolicies(request.isGlobal).getPersistence(request.topic, false)) match
                case None =>
                    pb.GetPersistenceResponse.Persistence.Unspecified(new PersistenceUnspecified())
                case Some(v) =>
                    pb.GetPersistenceResponse.Persistence.Specified(new PersistenceSpecified(
                        bookkeeperEnsemble = Option(v.getBookkeeperEnsemble).getOrElse(0),
                        bookkeeperWriteQuorum = Option(v.getBookkeeperWriteQuorum).getOrElse(0),
                        bookkeeperAckQuorum = Option(v.getBookkeeperAckQuorum).getOrElse(0),
                        managedLedgerMaxMarkDeleteRate = Option(v.getManagedLedgerMaxMarkDeleteRate).getOrElse(0.0)
                    ))

            Future.successful(GetPersistenceResponse(
                status = Some(Status(code = Code.OK.index)),
                persistence = persistencePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPersistenceResponse(status = Some(status)))
        }
    override def setPersistence(request: SetPersistenceRequest): Future[SetPersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting persistence policy for topic ${request.topic}")
            val persistencePolicies = PersistencePolicies(request.bookkeeperEnsemble, request.bookkeeperWriteQuorum, request.bookkeeperAckQuorum, request.managedLedgerMaxMarkDeleteRate)
            adminClient.topicPolicies(request.isGlobal).setPersistence(request.topic, persistencePolicies)
            Future.successful(SetPersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetPersistenceResponse(status = Some(status)))
        }
    override def removePersistence(request: RemovePersistenceRequest): Future[RemovePersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing persistence policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removePersistence(request.topic)
            Future.successful(RemovePersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemovePersistenceResponse(status = Some(status)))
        }
    override def getDeduplication(request: GetDeduplicationRequest): Future[GetDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val deduplication = Option(adminClient.topicPolicies(request.isGlobal).getDeduplicationStatus(request.topic, false)) match
                case None =>
                    pb.GetDeduplicationResponse.Deduplication.Unspecified(new DeduplicationUnspecified())
                case Some(v) =>
                    pb.GetDeduplicationResponse.Deduplication.Specified(new DeduplicationSpecified(enabled = v))

            Future.successful(GetDeduplicationResponse(
                status = Some(Status(code = Code.OK.index)),
                deduplication
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDeduplicationResponse(status = Some(status)))
        }
    override def setDeduplication(request: SetDeduplicationRequest): Future[SetDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting deduplication policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setDeduplicationStatus(request.topic, request.enabled)
            Future.successful(SetDeduplicationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDeduplicationResponse(status = Some(status)))
        }
    override def removeDeduplication(request: RemoveDeduplicationRequest): Future[RemoveDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing deduplication policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDeduplicationStatus(request.topic)
            Future.successful(RemoveDeduplicationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDeduplicationResponse(status = Some(status)))
        }
    override def getDeduplicationSnapshotInterval(request: GetDeduplicationSnapshotIntervalRequest): Future[GetDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val interval = Option(adminClient.topicPolicies(request.isGlobal).getDeduplicationSnapshotInterval(request.topic)) match
                case None =>
                    pb.GetDeduplicationSnapshotIntervalResponse.Interval.Disabled(new pb.DeduplicationSnapshotIntervalDisabled())
                case Some(v) =>
                    pb.GetDeduplicationSnapshotIntervalResponse.Interval.Enabled(new DeduplicationSnapshotIntervalEnabled(interval = v))

            Future.successful(GetDeduplicationSnapshotIntervalResponse(
                status = Some(Status(code = Code.OK.index)),
                interval
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }
    override def setDeduplicationSnapshotInterval(request: SetDeduplicationSnapshotIntervalRequest): Future[SetDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting deduplication snapshot interval policy for topic ${request.topic}. ${request.interval}")
            adminClient.topicPolicies(request.isGlobal).setDeduplicationSnapshotInterval(request.topic, request.interval)
            Future.successful(SetDeduplicationSnapshotIntervalResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }
    override def removeDeduplicationSnapshotInterval(request: RemoveDeduplicationSnapshotIntervalRequest): Future[RemoveDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing deduplication snapshot interval policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDeduplicationSnapshotInterval(request.topic)
            Future.successful(RemoveDeduplicationSnapshotIntervalResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }
    override def getDispatchRate(request: GetDispatchRateRequest): Future[GetDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val dispatchRatePb = Option(adminClient.topicPolicies(request.isGlobal).getDispatchRate(request.topic, false)) match
                case None =>
                    pb.GetDispatchRateResponse.DispatchRate.Unspecified(new DispatchRateUnspecified())
                case Some(v) =>
                    pb.GetDispatchRateResponse.DispatchRate.Specified(new DispatchRateSpecified(
                        rateInMsg = v.getDispatchThrottlingRateInMsg,
                        rateInByte = v.getDispatchThrottlingRateInByte,
                        periodInSecond = v.getRatePeriodInSecond,
                        isRelativeToPublishRate = v.isRelativeToPublishRate
                    ))

            Future.successful(GetDispatchRateResponse(
                status = Some(Status(code = Code.OK.index)),
                dispatchRate = dispatchRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDispatchRateResponse(status = Some(status)))
        }
    override def setDispatchRate(request: SetDispatchRateRequest): Future[SetDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting dispatch rate policy for topic ${request.topic}")
            val dispatchRate = DispatchRate.builder
                .dispatchThrottlingRateInByte(request.rateInByte)
                .dispatchThrottlingRateInMsg(request.rateInMsg)
                .ratePeriodInSecond(request.periodInSecond)
                .relativeToPublishRate(request.isRelativeToPublishRate)
                .build

            adminClient.topicPolicies(request.isGlobal).setDispatchRate(request.topic, dispatchRate)
            Future.successful(SetDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDispatchRateResponse(status = Some(status)))
        }
    override def removeDispatchRate(request: RemoveDispatchRateRequest): Future[RemoveDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing dispatch rate policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDispatchRate(request.topic)
            Future.successful(RemoveDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDispatchRateResponse(status = Some(status)))
        }
    override def getReplicatorDispatchRate(request: GetReplicatorDispatchRateRequest): Future[GetReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val replicatorDispatchRatePb = Option(adminClient.topicPolicies(request.isGlobal).getReplicatorDispatchRate(request.topic, false)) match
                case None =>
                    pb.GetReplicatorDispatchRateResponse.ReplicatorDispatchRate.Unspecified(new ReplicatorDispatchRateUnspecified())
                case Some(v) =>
                    pb.GetReplicatorDispatchRateResponse.ReplicatorDispatchRate.Specified(new ReplicatorDispatchRateSpecified(
                        rateInMsg = Option(v.getDispatchThrottlingRateInMsg).getOrElse(0),
                        rateInByte = Option(v.getDispatchThrottlingRateInByte).getOrElse(0),
                        periodInSecond = Option(v.getRatePeriodInSecond).getOrElse(0),
                        isRelativeToPublishRate = Option(v.isRelativeToPublishRate).getOrElse(false)
                    ))

            Future.successful(GetReplicatorDispatchRateResponse(
                status = Some(Status(code = Code.OK.index)),
                replicatorDispatchRate = replicatorDispatchRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetReplicatorDispatchRateResponse(status = Some(status)))
        }
    override def setReplicatorDispatchRate(request: SetReplicatorDispatchRateRequest): Future[SetReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting replicator dispatch rate for topic ${request.topic}")
            val dispatchRate = DispatchRate.builder
                .dispatchThrottlingRateInByte(request.rateInByte)
                .dispatchThrottlingRateInMsg(request.rateInMsg)
                .ratePeriodInSecond(request.periodInSecond)
                .relativeToPublishRate(request.isRelativeToPublishRate)
                .build

            adminClient.topicPolicies(request.isGlobal).setReplicatorDispatchRate(request.topic, dispatchRate)
            Future.successful(SetReplicatorDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetReplicatorDispatchRateResponse(status = Some(status)))
        }
    override def removeReplicatorDispatchRate(request: RemoveReplicatorDispatchRateRequest): Future[RemoveReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing replicator dispatch rate for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeReplicatorDispatchRate(request.topic)
            Future.successful(RemoveReplicatorDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveReplicatorDispatchRateResponse(status = Some(status)))
        }
    override def getSubscriptionDispatchRate(request: GetSubscriptionDispatchRateRequest): Future[GetSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscriptionDispatchRatePb = Option(adminClient.topicPolicies(request.isGlobal).getSubscriptionDispatchRate(request.topic, false)) match
                case None =>
                    pb.GetSubscriptionDispatchRateResponse.SubscriptionDispatchRate.Unspecified(new SubscriptionDispatchRateUnspecified())
                case Some(v) =>
                    pb.GetSubscriptionDispatchRateResponse.SubscriptionDispatchRate.Specified(new SubscriptionDispatchRateSpecified(
                        rateInMsg = Option(v.getDispatchThrottlingRateInMsg).getOrElse(0),
                        rateInByte = Option(v.getDispatchThrottlingRateInByte).getOrElse(0),
                        periodInSecond = Option(v.getRatePeriodInSecond).getOrElse(0),
                        isRelativeToPublishRate = Option(v.isRelativeToPublishRate).getOrElse(false)
                    ))

            Future.successful(GetSubscriptionDispatchRateResponse(
                status = Some(Status(code = Code.OK.index)),
                subscriptionDispatchRate = subscriptionDispatchRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscriptionDispatchRateResponse(status = Some(status)))
        }
    override def setSubscriptionDispatchRate(request: SetSubscriptionDispatchRateRequest): Future[SetSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting subscription dispatch rate for topic ${request.topic}")
            val dispatchRate = DispatchRate.builder
                .dispatchThrottlingRateInByte(request.rateInByte)
                .dispatchThrottlingRateInMsg(request.rateInMsg)
                .ratePeriodInSecond(request.periodInSecond)
                .relativeToPublishRate(request.isRelativeToPublishRate)
                .build

            adminClient.topicPolicies(request.isGlobal).setSubscriptionDispatchRate(request.topic, dispatchRate)
            Future.successful(SetSubscriptionDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscriptionDispatchRateResponse(status = Some(status)))
        }
    override def removeSubscriptionDispatchRate(request: RemoveSubscriptionDispatchRateRequest): Future[RemoveSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscription dispatch rate for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSubscriptionDispatchRate(request.topic)
            Future.successful(RemoveSubscriptionDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSubscriptionDispatchRateResponse(status = Some(status)))
        }
    override def getCompactionThreshold(request: GetCompactionThresholdRequest): Future[GetCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val threshold = Option(adminClient.topicPolicies(request.isGlobal).getCompactionThreshold(request.topic, false)).map(_.toLong) match
                case None => pb.GetCompactionThresholdResponse.Threshold.Disabled(new pb.CompactionThresholdDisabled())
                case Some(v) => pb.GetCompactionThresholdResponse.Threshold.Enabled(new CompactionThresholdEnabled(threshold = v))
            Future.successful(GetCompactionThresholdResponse(
                status = Some(Status(code = Code.OK.index)),
                threshold
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetCompactionThresholdResponse(status = Some(status)))
        }
    override def setCompactionThreshold(request: SetCompactionThresholdRequest): Future[SetCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting compaction threshold policy for topic ${request.topic}. ${request.threshold}")
            adminClient.topicPolicies(request.isGlobal).setCompactionThreshold(request.topic, request.threshold)
            Future.successful(SetCompactionThresholdResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetCompactionThresholdResponse(status = Some(status)))
        }
    override def removeCompactionThreshold(request: RemoveCompactionThresholdRequest): Future[RemoveCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing compaction threshold policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeCompactionThreshold(request.topic)
            Future.successful(RemoveCompactionThresholdResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveCompactionThresholdResponse(status = Some(status)))
        }
    override def getPublishRate(request: GetPublishRateRequest): Future[GetPublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val publishRatePb = Option(adminClient.topicPolicies(request.isGlobal).getPublishRate(request.topic)) match
                case None =>
                    pb.GetPublishRateResponse.PublishRate.Unspecified(new PublishRateUnspecified)
                case Some(v) =>
                    pb.GetPublishRateResponse.PublishRate.Specified(new PublishRateSpecified(
                        rateInMsg = Option(v.publishThrottlingRateInMsg).getOrElse(0),
                        rateInByte = Option(v.publishThrottlingRateInByte).getOrElse(0)
                    ))

            Future.successful(GetPublishRateResponse(
                status = Some(Status(code = Code.OK.index)),
                publishRate = publishRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPublishRateResponse(status = Some(status)))
        }
    override def setPublishRate(request: SetPublishRateRequest): Future[SetPublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting publish rate policy for topic ${request.topic}. ${request.rateInMsg}, ${request.rateInByte}")
            val publishRate = PublishRate( request.rateInMsg, request.rateInByte )
            adminClient.topicPolicies(request.isGlobal).setPublishRate(request.topic, publishRate)
            Future.successful(SetPublishRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetPublishRateResponse(status = Some(status)))
        }
    override def removePublishRate(request: RemovePublishRateRequest): Future[RemovePublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing publish rate policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removePublishRate(request.topic)
            Future.successful(RemovePublishRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemovePublishRateResponse(status = Some(status)))
        }
    override def getMaxConsumersPerSubscription(request: GetMaxConsumersPerSubscriptionRequest): Future[GetMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxConsumersPerSubscriptionPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxConsumersPerSubscription(request.topic)) match
                case None =>
                    pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscription.Unspecified(new MaxConsumersPerSubscriptionUnspecified())
                case Some(v) =>
                    pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscription.Specified(new MaxConsumersPerSubscriptionSpecified(
                        maxConsumersPerSubscription = v
                    ))

            Future.successful(GetMaxConsumersPerSubscriptionResponse(
                status = Some(Status(code = Code.OK.index)),
                maxConsumersPerSubscription = maxConsumersPerSubscriptionPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }
    override def setMaxConsumersPerSubscription(request: SetMaxConsumersPerSubscriptionRequest): Future[SetMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max consumers per subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxConsumersPerSubscription(request.topic, request.maxConsumersPerSubscription)
            Future.successful(SetMaxConsumersPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }
    override def removeMaxConsumersPerSubscription(request: RemoveMaxConsumersPerSubscriptionRequest): Future[RemoveMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max consumers per subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxConsumersPerSubscription(request.topic)
            Future.successful(RemoveMaxConsumersPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }
    override def getMaxProducers(request: GetMaxProducersRequest): Future[GetMaxProducersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxProducersPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxProducers(request.topic, false)) match
                case None =>
                    pb.GetMaxProducersResponse.MaxProducers.Unspecified(new MaxProducersUnspecified())
                case Some(v) =>
                    pb.GetMaxProducersResponse.MaxProducers.Specified(new MaxProducersSpecified(
                        maxProducers = v
                    ))

            Future.successful(GetMaxProducersResponse(
                status = Some(Status(code = Code.OK.index)),
                maxProducers = maxProducersPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxProducersResponse(status = Some(status)))
        }
    override def setMaxProducers(request: SetMaxProducersRequest): Future[SetMaxProducersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max producers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxProducers(request.topic, request.maxProducers)
            Future.successful(SetMaxProducersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxProducersResponse(status = Some(status)))
        }
    override def removeMaxProducers(request: RemoveMaxProducersRequest): Future[RemoveMaxProducersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max producers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxProducers(request.topic)
            Future.successful(RemoveMaxProducersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxProducersResponse(status = Some(status)))
        }
    override def getMaxSubscriptionsPerTopic(request: GetMaxSubscriptionsPerTopicRequest): Future[GetMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxSubscriptionsPerTopicPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxSubscriptionsPerTopic(request.topic)) match
                case None =>
                    pb.GetMaxSubscriptionsPerTopicResponse.MaxSubscriptionsPerTopic.Unspecified(new MaxSubscriptionsPerTopicUnspecified())
                case Some(v) =>
                    pb.GetMaxSubscriptionsPerTopicResponse.MaxSubscriptionsPerTopic.Specified(new MaxSubscriptionsPerTopicSpecified(
                        maxSubscriptionsPerTopic = v
                    ))

            Future.successful(GetMaxSubscriptionsPerTopicResponse(
                status = Some(Status(code = Code.OK.index)),
                maxSubscriptionsPerTopic = maxSubscriptionsPerTopicPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }
    override def setMaxSubscriptionsPerTopic(request: SetMaxSubscriptionsPerTopicRequest): Future[SetMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max subscriptions per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxSubscriptionsPerTopic(request.topic, request.maxSubscriptionsPerTopic)
            Future.successful(SetMaxSubscriptionsPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }
    override def removeMaxSubscriptionsPerTopic(request: RemoveMaxSubscriptionsPerTopicRequest): Future[RemoveMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max subscriptions per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxSubscriptionsPerTopic(request.topic)
            Future.successful(RemoveMaxSubscriptionsPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }
    override def getMaxConsumers(request: GetMaxConsumersRequest): Future[GetMaxConsumersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxConsumersPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxConsumers(request.topic, false)) match
                case None =>
                    pb.GetMaxConsumersResponse.MaxConsumers.Unspecified(new MaxConsumersUnspecified())
                case Some(v) =>
                    pb.GetMaxConsumersResponse.MaxConsumers.Specified(new MaxConsumersSpecified(
                        maxConsumers = v
                    ))

            Future.successful(GetMaxConsumersResponse(
                status = Some(Status(code = Code.OK.index)),
                maxConsumers = maxConsumersPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxConsumersResponse(status = Some(status)))
        }
    override def setMaxConsumers(request: SetMaxConsumersRequest): Future[SetMaxConsumersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max consumers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxConsumers(request.topic, request.maxConsumers)
            Future.successful(SetMaxConsumersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxConsumersResponse(status = Some(status)))
        }
    override def removeMaxConsumers(request: RemoveMaxConsumersRequest): Future[RemoveMaxConsumersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max consumers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxConsumers(request.topic)
            Future.successful(RemoveMaxConsumersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxConsumersResponse(status = Some(status)))
        }
    override def getSubscriptionTypesEnabled(request: GetSubscriptionTypesEnabledRequest): Future[GetSubscriptionTypesEnabledResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def subscriptionTypeToPb(subscriptionType: SubscriptionType): pb.SubscriptionType =
            subscriptionType match
                case SubscriptionType.Exclusive => pb.SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE
                case SubscriptionType.Failover => pb.SubscriptionType.SUBSCRIPTION_TYPE_FAILOVER
                case SubscriptionType.Shared => pb.SubscriptionType.SUBSCRIPTION_TYPE_SHARED
                case SubscriptionType.Key_Shared => pb.SubscriptionType.SUBSCRIPTION_TYPE_KEY_SHARED

        try {
            def inherited = pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabled.Inherited(new SubscriptionTypesEnabledInherited())
            val subscriptionTypesEnabledPb = Option(adminClient.topicPolicies(request.isGlobal).getSubscriptionTypesEnabled(request.topic)) match
                case None => inherited
                case Some(v) if v.size() == 0 => inherited
                case Some(v) =>
                    pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabled.Specified(new SubscriptionTypesEnabledSpecified(
                        types = v.asScala.map(subscriptionTypeToPb).toSeq
                    ))
            Future.successful(GetSubscriptionTypesEnabledResponse(
                status = Some(Status(code = Code.OK.index)),
                subscriptionTypesEnabled = subscriptionTypesEnabledPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscriptionTypesEnabledResponse(status = Some(status)))
        }
    override def setSubscriptionTypesEnabled(request: SetSubscriptionTypesEnabledRequest): Future[SetSubscriptionTypesEnabledResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def pbToSubscriptionType(subscriptionTypePb: pb.SubscriptionType): SubscriptionType =
            subscriptionTypePb match
                case pb.SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE => SubscriptionType.Exclusive
                case pb.SubscriptionType.SUBSCRIPTION_TYPE_FAILOVER => SubscriptionType.Failover
                case pb.SubscriptionType.SUBSCRIPTION_TYPE_SHARED => SubscriptionType.Shared
                case pb.SubscriptionType.SUBSCRIPTION_TYPE_KEY_SHARED => SubscriptionType.Key_Shared
                case _ => throw new IllegalArgumentException("Subscription type not specified")

        try {
            logger.info(s"Setting subscription types enabled policy for topic ${request.topic}")

            val subscriptionTypesEnabled = request.types.map(pbToSubscriptionType).toSet.asJava
            adminClient.topicPolicies(request.isGlobal).setSubscriptionTypesEnabled(request.topic, subscriptionTypesEnabled)
            Future.successful(SetSubscriptionTypesEnabledResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscriptionTypesEnabledResponse(status = Some(status)))
        }
    override def removeSubscriptionTypesEnabled(request: RemoveSubscriptionTypesEnabledRequest): Future[RemoveSubscriptionTypesEnabledResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscription types enabled policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSubscriptionTypesEnabled(request.topic)
            Future.successful(RemoveSubscriptionTypesEnabledResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSubscriptionTypesEnabledResponse(status = Some(status)))
        }
    override def getSubscribeRate(request: GetSubscribeRateRequest): Future[GetSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscribeRatePb = Option(adminClient.topicPolicies(request.isGlobal).getSubscribeRate(request.topic, false)) match
                case None =>
                    pb.GetSubscribeRateResponse.SubscribeRate.Unspecified(new SubscribeRateUnspecified())
                case Some(v) =>
                    pb.GetSubscribeRateResponse.SubscribeRate.Specified(new SubscribeRateSpecified(
                        subscribeThrottlingRatePerConsumer = Option(v.subscribeThrottlingRatePerConsumer).getOrElse(0),
                        ratePeriodInSeconds = Option(v.ratePeriodInSecond).getOrElse(0)
                    ))

            Future.successful(GetSubscribeRateResponse(
                status = Some(Status(code = Code.OK.index)),
                subscribeRate = subscribeRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscribeRateResponse(status = Some(status)))
        }
    override def setSubscribeRate(request: SetSubscribeRateRequest): Future[SetSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting subscribe rate policy for topic ${request.topic}")
            val subscribeRate = new SubscribeRate(request.subscribeThrottlingRatePerConsumer, request.ratePeriodInSeconds)

            adminClient.topicPolicies(request.isGlobal).setSubscribeRate(request.topic, subscribeRate)
            Future.successful(SetSubscribeRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscribeRateResponse(status = Some(status)))
        }
    override def removeSubscribeRate(request: RemoveSubscribeRateRequest): Future[RemoveSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscribe rate policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSubscribeRate(request.topic)
            Future.successful(RemoveSubscribeRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSubscribeRateResponse(status = Some(status)))
        }
    override def getSchemaCompatibilityStrategy(request: GetSchemaCompatibilityStrategyRequest): Future[GetSchemaCompatibilityStrategyResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val strategy = Option(adminClient.topicPolicies(request.isGlobal).getSchemaCompatibilityStrategy(request.topic, false)) match
                case None =>
                    pb.GetSchemaCompatibilityStrategyResponse.Strategy.Inherited(new SchemaCompatibilityStrategyInherited())
                case Some(v) =>
                    pb.GetSchemaCompatibilityStrategyResponse.Strategy.Specified(new SchemaCompatibilityStrategySpecified(
                        strategy = schemaCompatibilityStrategyToPb(v)
                    ))
            val status = Status(code = Code.OK.index)
            Future.successful(
                GetSchemaCompatibilityStrategyResponse(
                    status = Some(status),
                    strategy = strategy
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSchemaCompatibilityStrategyResponse(status = Some(status)))
        }
    override def setSchemaCompatibilityStrategy(request: SetSchemaCompatibilityStrategyRequest): Future[SetSchemaCompatibilityStrategyResponse] =
        logger.info(s"Setting schema compatibility strategy policy for topic ${request.topic}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.topicPolicies(request.isGlobal).setSchemaCompatibilityStrategy(request.topic, schemaCompatibilityStrategyFromPb(request.strategy))
            val status = Status(code = Code.OK.index)
            Future.successful(SetSchemaCompatibilityStrategyResponse(status = Some(status)))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSchemaCompatibilityStrategyResponse(status = Some(status)))
        }
    override def removeSchemaCompatibilityStrategy(request: RemoveSchemaCompatibilityStrategyRequest): Future[RemoveSchemaCompatibilityStrategyResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing schema compatibility strategy policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSchemaCompatibilityStrategy(request.topic)
            Future.successful(RemoveSchemaCompatibilityStrategyResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSchemaCompatibilityStrategyResponse(status = Some(status)))
        }
    override def getMaxMessageSize(request: GetMaxMessageSizeRequest): Future[GetMaxMessageSizeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxMessageSize = Option(adminClient.topicPolicies(request.isGlobal).getMaxMessageSize(request.topic)).map(_.toInt) match
                case None => pb.GetMaxMessageSizeResponse.MaxMessageSize.Disabled(new MaxMessageSizeDisabled())
                case Some(v) => pb.GetMaxMessageSizeResponse.MaxMessageSize.Enabled(new MaxMessageSizeEnabled(maxMessageSize = v))
            Future.successful(GetMaxMessageSizeResponse(
                status = Some(Status(code = Code.OK.index)),
                maxMessageSize
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxMessageSizeResponse(status = Some(status)))
        }
    override def setMaxMessageSize(request: SetMaxMessageSizeRequest): Future[SetMaxMessageSizeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max message size policy for topic ${request.topic}. ${request.maxMessageSize}")
            adminClient.topicPolicies(request.isGlobal).setMaxMessageSize(request.topic, request.maxMessageSize)
            Future.successful(SetMaxMessageSizeResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxMessageSizeResponse(status = Some(status)))
        }
    override def removeMaxMessageSize(request: RemoveMaxMessageSizeRequest): Future[RemoveMaxMessageSizeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max message size policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxMessageSize(request.topic)
            Future.successful(RemoveMaxMessageSizeResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxMessageSizeResponse(status = Some(status)))
        }
