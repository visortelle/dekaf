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



