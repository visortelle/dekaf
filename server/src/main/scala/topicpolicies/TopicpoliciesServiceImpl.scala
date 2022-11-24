package topicpolicies

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.topicpolicies.v1.topicpolicies.{
    TopicpoliciesServiceGrpc,

    GetBacklogQuotasRequest,
    GetBacklogQuotasResponse,
    SetBacklogQuotasRequest,
    SetBacklogQuotasResponse,
    RemoveBacklogQuotaRequest,
    RemoveBacklogQuotaResponse,

    GetDelayedDeliveryRequest,
    GetDelayedDeliveryResponse,
    SetDelayedDeliveryRequest,
    SetDelayedDeliveryResponse,
    RemoveDelayedDeliveryRequest,
    RemoveDelayedDeliveryResponse,
    DelayedDeliverySpecified,
    DelayedDeliveryUnspecified,

    GetMessageTtlRequest,
    GetMessageTtlResponse,
    SetMessageTtlRequest,
    SetMessageTtlResponse,
    RemoveMessageTtlRequest,
    RemoveMessageTtlResponse,
    MessageTtlSpecified,
    MessageTtlUnspecified,

    GetRetentionRequest,
    GetRetentionResponse,
    SetRetentionRequest,
    SetRetentionResponse,
    RemoveRetentionRequest,
    RemoveRetentionResponse,
    RetentionSpecified,
    RetentionUnspecified,

    GetMaxUnackedMessagesOnConsumerRequest,
    GetMaxUnackedMessagesOnConsumerResponse,
    SetMaxUnackedMessagesOnConsumerRequest,
    SetMaxUnackedMessagesOnConsumerResponse,
    RemoveMaxUnackedMessagesOnConsumerRequest,
    RemoveMaxUnackedMessagesOnConsumerResponse,
    MaxUnackedMessagesOnConsumerSpecified,
    MaxUnackedMessagesOnConsumerUnspecified,

    GetMaxUnackedMessagesOnSubscriptionRequest,
    GetMaxUnackedMessagesOnSubscriptionResponse,
    SetMaxUnackedMessagesOnSubscriptionRequest,
    SetMaxUnackedMessagesOnSubscriptionResponse,
    RemoveMaxUnackedMessagesOnSubscriptionRequest,
    RemoveMaxUnackedMessagesOnSubscriptionResponse,
    MaxUnackedMessagesOnSubscriptionSpecified,
    MaxUnackedMessagesOnSubscriptionUnspecified,

    GetInactiveTopicPoliciesRequest,
    GetInactiveTopicPoliciesResponse,
    SetInactiveTopicPoliciesRequest,
    SetInactiveTopicPoliciesResponse,
    RemoveInactiveTopicPoliciesRequest,
    RemoveInactiveTopicPoliciesResponse,
    InactiveTopicPoliciesDeleteMode,
    InactiveTopicPoliciesSpecified,
    InactiveTopicPoliciesUnspecified,

    GetPersistenceRequest,
    GetPersistenceResponse,
    SetPersistenceRequest,
    SetPersistenceResponse,
    RemovePersistenceRequest,
    RemovePersistenceResponse,
    PersistenceSpecified,
    PersistenceUnspecified,

}
import com.tools.teal.pulsar.ui.topicpolicies.v1.topicpolicies as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import org.apache.pulsar.common.policies.data.BacklogQuota.{ BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder }
import org.apache.pulsar.common.policies.data.{ AutoSubscriptionCreationOverride, AutoTopicCreationOverride, BookieAffinityGroupData, BundlesData, DelayedDeliveryPolicies, DispatchRate, InactiveTopicDeleteMode, InactiveTopicPolicies, PersistencePolicies, Policies, RetentionPolicies }

import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*
import scala.concurrent.Future

class TopicpoliciesServiceImpl extends TopicpoliciesServiceGrpc.TopicpoliciesService:
    val logger: Logger = Logger(getClass.getName)

    override def getBacklogQuotas(request: GetBacklogQuotasRequest): Future[GetBacklogQuotasResponse] =
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
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetBacklogQuotasResponse(status = Some(status)))
        }
    override def setBacklogQuotas(request: SetBacklogQuotasRequest): Future[SetBacklogQuotasResponse] =
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

                    logger.info(s"Setting backlog quota policy (destination storage) on topic ${request.topic} to ${backlogQuota}")
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

                    logger.info(s"Setting backlog quota (message age) on topic ${request.topic} to ${backlogQuota}")
                    adminClient.topicPolicies(request.isGlobal).setBacklogQuota(request.topic, backlogQuota, BacklogQuotaType.message_age)
                case None =>

            Future.successful(SetBacklogQuotasResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetBacklogQuotasResponse(status = Some(status)))
        }
    override def removeBacklogQuota(request: RemoveBacklogQuotaRequest): Future[RemoveBacklogQuotaResponse] =
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
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveBacklogQuotaResponse(status = Some(status)))
        }
    override def getDelayedDelivery(request: GetDelayedDeliveryRequest): Future[GetDelayedDeliveryResponse] =
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDelayedDeliveryResponse(status = Some(status)))
        }
    override def setDelayedDelivery(request: SetDelayedDeliveryRequest): Future[SetDelayedDeliveryResponse] =
        try {
            logger.info(s"Setting delayed delivery policy for topic ${request.topic}")
            val delayedDeliveryPolicies = DelayedDeliveryPolicies.builder
                .active(request.enabled)
                .tickTime(request.tickTimeMs)
                .build()

            adminClient.topicPolicies(request.isGlobal).setDelayedDeliveryPolicy(request.topic, delayedDeliveryPolicies)
            Future.successful(SetDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDelayedDeliveryResponse(status = Some(status)))
        }
    override def removeDelayedDelivery(request: RemoveDelayedDeliveryRequest): Future[RemoveDelayedDeliveryResponse] =
        try {
            logger.info(s"Removing delayed delivery policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDelayedDeliveryPolicy(request.topic)
            Future.successful(RemoveDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDelayedDeliveryResponse(status = Some(status)))
        }
    override def getMessageTtl(request: GetMessageTtlRequest): Future[GetMessageTtlResponse] =
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMessageTtlResponse(status = Some(status)))
        }
    override def setMessageTtl(request: SetMessageTtlRequest): Future[SetMessageTtlResponse] =
        try {
            logger.info(s"Setting message TTL policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMessageTTL(request.topic, request.messageTtlSeconds)
            Future.successful(SetMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMessageTtlResponse(status = Some(status)))
        }
    override def removeMessageTtl(request: RemoveMessageTtlRequest): Future[RemoveMessageTtlResponse] =
        try {
            logger.info(s"Removing message TTL policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMessageTTL(request.topic)
            Future.successful(RemoveMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMessageTtlResponse(status = Some(status)))
        }
    override def getRetention(request: GetRetentionRequest): Future[GetRetentionResponse] =
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetRetentionResponse(status = Some(status)))
        }
    override def setRetention(request: SetRetentionRequest): Future[SetRetentionResponse] =
        try {
            logger.info(s"Setting retention for topic ${request.topic}")
            val retention = new RetentionPolicies(request.retentionTimeInMinutes, request.retentionSizeInMb)

            adminClient.topicPolicies(request.isGlobal).setRetention(request.topic, retention)
            Future.successful(SetRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetRetentionResponse(status = Some(status)))
        }
    override def removeRetention(request: RemoveRetentionRequest): Future[RemoveRetentionResponse] =
        try {
            logger.info(s"Removing retention for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeRetention(request.topic)
            Future.successful(RemoveRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveRetentionResponse(status = Some(status)))
        }
    override def getMaxUnackedMessagesOnConsumer(request: GetMaxUnackedMessagesOnConsumerRequest): Future[GetMaxUnackedMessagesOnConsumerResponse] =
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }
    override def setMaxUnackedMessagesOnConsumer(request: SetMaxUnackedMessagesOnConsumerRequest): Future[SetMaxUnackedMessagesOnConsumerResponse] =
        try {
            logger.info(s"Setting max unacked messages on consumer policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxUnackedMessagesOnConsumer(request.topic, request.maxUnackedMessagesOnConsumer)
            Future.successful(SetMaxUnackedMessagesOnConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }

    override def removeMaxUnackedMessagesOnConsumer(request: RemoveMaxUnackedMessagesOnConsumerRequest): Future[RemoveMaxUnackedMessagesOnConsumerResponse] =
        try {
            logger.info(s"Removing max unacked messages on consumer policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxUnackedMessagesOnConsumer(request.topic)
            Future.successful(RemoveMaxUnackedMessagesOnConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }
    override def getMaxUnackedMessagesOnSubscription(request: GetMaxUnackedMessagesOnSubscriptionRequest): Future[GetMaxUnackedMessagesOnSubscriptionResponse] =
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def setMaxUnackedMessagesOnSubscription(request: SetMaxUnackedMessagesOnSubscriptionRequest): Future[SetMaxUnackedMessagesOnSubscriptionResponse] =
        try {
            logger.info(s"Setting max unacked messages on subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxUnackedMessagesOnSubscription(request.topic, request.maxUnackedMessagesOnSubscription)
            Future.successful(SetMaxUnackedMessagesOnSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def removeMaxUnackedMessagesOnSubscription(request: RemoveMaxUnackedMessagesOnSubscriptionRequest): Future[RemoveMaxUnackedMessagesOnSubscriptionResponse] =
        try {
            logger.info(s"Removing max unacked messages on subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxUnackedMessagesOnSubscription(request.topic)
            Future.successful(RemoveMaxUnackedMessagesOnSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def getInactiveTopicPolicies(request: GetInactiveTopicPoliciesRequest): Future[GetInactiveTopicPoliciesResponse] =
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
                                InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP,
                            maxInactiveDurationSeconds = v.getMaxInactiveDurationSeconds,
                        deleteWhileInactive = v.isDeleteWhileInactive
                    ))

            Future.successful(GetInactiveTopicPoliciesResponse(
                status = Some(Status(code = Code.OK.index)),
                inactiveTopicPolicies = inactiveTopicPoliciesPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def setInactiveTopicPolicies(request: SetInactiveTopicPoliciesRequest): Future[SetInactiveTopicPoliciesResponse] =
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

            adminClient.topicPolicies(request.isGlobal).setInactiveTopicPolicies(request.topic, inactiveTopicPolicies)
            Future.successful(SetInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def removeInactiveTopicPolicies(request: RemoveInactiveTopicPoliciesRequest): Future[RemoveInactiveTopicPoliciesResponse] =
        try {
            logger.info(s"Removing inactive topic policies for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeInactiveTopicPolicies(request.topic)
            Future.successful(RemoveInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def getPersistence(request: GetPersistenceRequest): Future[GetPersistenceResponse] =
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPersistenceResponse(status = Some(status)))
        }
    override def setPersistence(request: SetPersistenceRequest): Future[SetPersistenceResponse] =
        try {
            logger.info(s"Setting persistence policy for topic ${request.topic}")
            val persistencePolicies = PersistencePolicies(request.bookkeeperEnsemble, request.bookkeeperWriteQuorum, request.bookkeeperAckQuorum, request.managedLedgerMaxMarkDeleteRate)
            adminClient.topicPolicies(request.isGlobal).setPersistence(request.topic, persistencePolicies)
            Future.successful(SetPersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetPersistenceResponse(status = Some(status)))
        }
    override def removePersistence(request: RemovePersistenceRequest): Future[RemovePersistenceResponse] =
        try {
            logger.info(s"Removing persistence policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removePersistence(request.topic)
            Future.successful(RemovePersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemovePersistenceResponse(status = Some(status)))
        }
