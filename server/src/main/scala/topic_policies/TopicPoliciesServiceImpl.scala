package topic_policies

import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.topic_policies.v1.topic_policies as pb
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.policies.data.BacklogQuota.{BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder}
import org.apache.pulsar.common.policies.data.*
import pulsar_auth.RequestContext

import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class TopicPoliciesServiceImpl extends pb.TopicPoliciesServiceGrpc.TopicPoliciesService:
    val logger: Logger = Logger(getClass.getName)

    override def getBacklogQuotas(request: pb.GetBacklogQuotasRequest): Future[pb.GetBacklogQuotasResponse] =
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
                pb.GetBacklogQuotasResponse(
                    status = Some(Status(code = Code.OK.index)),
                    destinationStorage = destinationStorageBacklogQuotaPb,
                    messageAge = messageAgeBacklogQuotaPb,
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetBacklogQuotasResponse(status = Some(status)))
        }
    override def setBacklogQuotas(request: pb.SetBacklogQuotasRequest): Future[pb.SetBacklogQuotasResponse] =
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

            Future.successful(pb.SetBacklogQuotasResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetBacklogQuotasResponse(status = Some(status)))
        }
    override def removeBacklogQuota(request: pb.RemoveBacklogQuotaRequest): Future[pb.RemoveBacklogQuotaResponse] =
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
                    return Future.successful(pb.RemoveBacklogQuotaResponse(status = Some(status)))

            Future.successful(pb.RemoveBacklogQuotaResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveBacklogQuotaResponse(status = Some(status)))
        }
    override def getDelayedDelivery(request: pb.GetDelayedDeliveryRequest): Future[pb.GetDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val delayedDeliveryPb = Option(adminClient.topicPolicies(request.isGlobal).getDelayedDeliveryPolicy(request.topic, false)) match
                case None =>
                    pb.GetDelayedDeliveryResponse.DelayedDelivery.Unspecified(new pb.DelayedDeliveryUnspecified())
                case Some(v) =>
                    pb.GetDelayedDeliveryResponse.DelayedDelivery.Specified(
                        new pb.DelayedDeliverySpecified(
                            enabled = Option(v.isActive).getOrElse(false),
                            tickTimeMs = Option(v.getTickTime).getOrElse(0)
                        )
                    )

            Future.successful(pb.GetDelayedDeliveryResponse(
                status = Some(Status(code = Code.OK.index)),
                delayedDelivery = delayedDeliveryPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetDelayedDeliveryResponse(status = Some(status)))
        }
    override def setDelayedDelivery(request: pb.SetDelayedDeliveryRequest): Future[pb.SetDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting delayed delivery policy for topic ${request.topic}")
            val delayedDeliveryPolicies = DelayedDeliveryPolicies.builder
                .active(request.enabled)
                .tickTime(request.tickTimeMs)
                .build()
            adminClient.topicPolicies(request.isGlobal).setDelayedDeliveryPolicy(request.topic, delayedDeliveryPolicies)
            
            Future.successful(pb.SetDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetDelayedDeliveryResponse(status = Some(status)))
        }
    override def removeDelayedDelivery(request: pb.RemoveDelayedDeliveryRequest): Future[pb.RemoveDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing delayed delivery policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDelayedDeliveryPolicy(request.topic)
            
            Future.successful(pb.RemoveDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveDelayedDeliveryResponse(status = Some(status)))
        }
    override def getMessageTtl(request: pb.GetMessageTtlRequest): Future[pb.GetMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val messageTtlPb = Option(adminClient.topicPolicies(request.isGlobal).getMessageTTL(request.topic, false)) match
                case None =>
                    pb.GetMessageTtlResponse.MessageTtl.Unspecified(new pb.MessageTtlUnspecified())
                case Some(v) =>
                    pb.GetMessageTtlResponse.MessageTtl.Specified(
                        new pb.MessageTtlSpecified(
                            messageTtlSeconds = v
                        )
                    )

            Future.successful(pb.GetMessageTtlResponse(
                status = Some(Status(code = Code.OK.index)),
                messageTtl = messageTtlPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMessageTtlResponse(status = Some(status)))
        }
    override def setMessageTtl(request: pb.SetMessageTtlRequest): Future[pb.SetMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting message TTL policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMessageTTL(request.topic, request.messageTtlSeconds)
            
            Future.successful(pb.SetMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMessageTtlResponse(status = Some(status)))
        }
    override def removeMessageTtl(request: pb.RemoveMessageTtlRequest): Future[pb.RemoveMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing message TTL policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMessageTTL(request.topic)
            
            Future.successful(pb.RemoveMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMessageTtlResponse(status = Some(status)))
        }
    override def getRetention(request: pb.GetRetentionRequest): Future[pb.GetRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val retentionPb = Option(adminClient.topicPolicies(request.isGlobal).getRetention(request.topic, false)) match
                case None =>
                    pb.GetRetentionResponse.Retention.Unspecified(new pb.RetentionUnspecified())
                case Some(v) =>
                    pb.GetRetentionResponse.Retention.Specified(
                        new pb.RetentionSpecified(
                            retentionTimeInMinutes = Option(v.getRetentionTimeInMinutes).getOrElse(0),
                            retentionSizeInMb = Option(v.getRetentionSizeInMB).map(_.toInt).getOrElse(0)
                        )
                    )

            Future.successful(pb.GetRetentionResponse(
                status = Some(Status(code = Code.OK.index)),
                retention = retentionPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetRetentionResponse(status = Some(status)))
        }
    override def setRetention(request: pb.SetRetentionRequest): Future[pb.SetRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting retention for topic ${request.topic}")
            val retention = new RetentionPolicies(request.retentionTimeInMinutes, request.retentionSizeInMb)
            adminClient.topicPolicies(request.isGlobal).setRetention(request.topic, retention)
            
            Future.successful(pb.SetRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetRetentionResponse(status = Some(status)))
        }
    override def removeRetention(request: pb.RemoveRetentionRequest): Future[pb.RemoveRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing retention for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeRetention(request.topic)
            
            Future.successful(pb.RemoveRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveRetentionResponse(status = Some(status)))
        }
    override def getMaxUnackedMessagesOnConsumer(request: pb.GetMaxUnackedMessagesOnConsumerRequest): Future[pb.GetMaxUnackedMessagesOnConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxUnackedMessagesOnConsumerPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxUnackedMessagesOnConsumer(request.topic, false)) match
                case None =>
                    pb.GetMaxUnackedMessagesOnConsumerResponse.MaxUnackedMessagesOnConsumer.Unspecified(new pb.MaxUnackedMessagesOnConsumerUnspecified())
                case Some(v) =>
                    pb.GetMaxUnackedMessagesOnConsumerResponse.MaxUnackedMessagesOnConsumer.Specified(
                        new pb.MaxUnackedMessagesOnConsumerSpecified(
                            maxUnackedMessagesOnConsumer = v
                        )
                    )

            Future.successful(pb.GetMaxUnackedMessagesOnConsumerResponse(
                status = Some(Status(code = Code.OK.index)),
                maxUnackedMessagesOnConsumer = maxUnackedMessagesOnConsumerPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }
    override def setMaxUnackedMessagesOnConsumer(request: pb.SetMaxUnackedMessagesOnConsumerRequest): Future[pb.SetMaxUnackedMessagesOnConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max unacked messages on consumer policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxUnackedMessagesOnConsumer(request.topic, request.maxUnackedMessagesOnConsumer)
            
            Future.successful(pb.SetMaxUnackedMessagesOnConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }

    override def removeMaxUnackedMessagesOnConsumer(request: pb.RemoveMaxUnackedMessagesOnConsumerRequest): Future[pb.RemoveMaxUnackedMessagesOnConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max unacked messages on consumer policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxUnackedMessagesOnConsumer(request.topic)
            
            Future.successful(pb.RemoveMaxUnackedMessagesOnConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMaxUnackedMessagesOnConsumerResponse(status = Some(status)))
        }
    override def getMaxUnackedMessagesOnSubscription(request: pb.GetMaxUnackedMessagesOnSubscriptionRequest): Future[pb.GetMaxUnackedMessagesOnSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxUnackedMessagesOnSubscriptionPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxUnackedMessagesOnSubscription(request.topic, false)) match
                case None =>
                    pb.GetMaxUnackedMessagesOnSubscriptionResponse.MaxUnackedMessagesOnSubscription.Unspecified(new pb.MaxUnackedMessagesOnSubscriptionUnspecified())
                case Some(v) =>
                    pb.GetMaxUnackedMessagesOnSubscriptionResponse.MaxUnackedMessagesOnSubscription.Specified(
                        new pb.MaxUnackedMessagesOnSubscriptionSpecified(
                            maxUnackedMessagesOnSubscription = v
                        )
                    )

            Future.successful(pb.GetMaxUnackedMessagesOnSubscriptionResponse(
                status = Some(Status(code = Code.OK.index)),
                maxUnackedMessagesOnSubscription = maxUnackedMessagesOnSubscriptionPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def setMaxUnackedMessagesOnSubscription(request: pb.SetMaxUnackedMessagesOnSubscriptionRequest): Future[pb.SetMaxUnackedMessagesOnSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max unacked messages on subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxUnackedMessagesOnSubscription(request.topic, request.maxUnackedMessagesOnSubscription)
            
            Future.successful(pb.SetMaxUnackedMessagesOnSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def removeMaxUnackedMessagesOnSubscription(request: pb.RemoveMaxUnackedMessagesOnSubscriptionRequest): Future[pb.RemoveMaxUnackedMessagesOnSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max unacked messages on subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxUnackedMessagesOnSubscription(request.topic)
            
            Future.successful(pb.RemoveMaxUnackedMessagesOnSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMaxUnackedMessagesOnSubscriptionResponse(status = Some(status)))
        }
    override def getInactiveTopicPolicies(request: pb.GetInactiveTopicPoliciesRequest): Future[pb.GetInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val inactiveTopicPoliciesPb = Option(adminClient.topicPolicies(request.isGlobal).getInactiveTopicPolicies(request.topic, false)) match
                case None =>
                    pb.GetInactiveTopicPoliciesResponse.InactiveTopicPolicies.Unspecified(pb.InactiveTopicPoliciesUnspecified())
                case Some(v) =>
                    pb.GetInactiveTopicPoliciesResponse.InactiveTopicPolicies.Specified(
                        pb.InactiveTopicPoliciesSpecified(
                            inactiveTopicDeleteMode = v.getInactiveTopicDeleteMode match
                                case InactiveTopicDeleteMode.delete_when_no_subscriptions =>
                                    pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS
                                case InactiveTopicDeleteMode.delete_when_subscriptions_caught_up =>
                                    pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP
                            ,
                            maxInactiveDurationSeconds = v.getMaxInactiveDurationSeconds,
                            deleteWhileInactive = v.isDeleteWhileInactive
                        )
                    )

            Future.successful(pb.GetInactiveTopicPoliciesResponse(
                status = Some(Status(code = Code.OK.index)),
                inactiveTopicPolicies = inactiveTopicPoliciesPb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def setInactiveTopicPolicies(request: pb.SetInactiveTopicPoliciesRequest): Future[pb.SetInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting inactive topic policies for topic ${request.topic}")

            val inactiveTopicPolicies = new InactiveTopicPolicies()
            inactiveTopicPolicies.setDeleteWhileInactive(request.deleteWhileInactive)
            inactiveTopicPolicies.setMaxInactiveDurationSeconds(request.maxInactiveDurationSeconds)

            request.inactiveTopicDeleteMode match
                case pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS =>
                    inactiveTopicPolicies.setInactiveTopicDeleteMode(InactiveTopicDeleteMode.delete_when_no_subscriptions)
                case pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP =>
                    inactiveTopicPolicies.setInactiveTopicDeleteMode(InactiveTopicDeleteMode.delete_when_subscriptions_caught_up)
                case _ =>
                    throw new IllegalArgumentException("InactiveTopicPoliciesDeleteMode should be specified.")

            adminClient.topicPolicies(request.isGlobal).setInactiveTopicPolicies(request.topic, inactiveTopicPolicies)
            Future.successful(pb.SetInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def removeInactiveTopicPolicies(request: pb.RemoveInactiveTopicPoliciesRequest): Future[pb.RemoveInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing inactive topic policies for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeInactiveTopicPolicies(request.topic)
            
            Future.successful(pb.RemoveInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveInactiveTopicPoliciesResponse(status = Some(status)))
        }
    override def getPersistence(request: pb.GetPersistenceRequest): Future[pb.GetPersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val persistencePb = Option(adminClient.topicPolicies(request.isGlobal).getPersistence(request.topic, false)) match
                case None =>
                    pb.GetPersistenceResponse.Persistence.Unspecified(new pb.PersistenceUnspecified())
                case Some(v) =>
                    pb.GetPersistenceResponse.Persistence.Specified(
                        new pb.PersistenceSpecified(
                            bookkeeperEnsemble = Option(v.getBookkeeperEnsemble).getOrElse(0),
                            bookkeeperWriteQuorum = Option(v.getBookkeeperWriteQuorum).getOrElse(0),
                            bookkeeperAckQuorum = Option(v.getBookkeeperAckQuorum).getOrElse(0),
                            managedLedgerMaxMarkDeleteRate = Option(v.getManagedLedgerMaxMarkDeleteRate).getOrElse(0.0)
                        )
                    )

            Future.successful(pb.GetPersistenceResponse(
                status = Some(Status(code = Code.OK.index)),
                persistence = persistencePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetPersistenceResponse(status = Some(status)))
        }
    override def setPersistence(request: pb.SetPersistenceRequest): Future[pb.SetPersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting persistence policy for topic ${request.topic}")
            val persistencePolicies = PersistencePolicies(request.bookkeeperEnsemble, request.bookkeeperWriteQuorum, request.bookkeeperAckQuorum, request.managedLedgerMaxMarkDeleteRate)
            adminClient.topicPolicies(request.isGlobal).setPersistence(request.topic, persistencePolicies)
            
            Future.successful(pb.SetPersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetPersistenceResponse(status = Some(status)))
        }
    override def removePersistence(request: pb.RemovePersistenceRequest): Future[pb.RemovePersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing persistence policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removePersistence(request.topic)
            
            Future.successful(pb.RemovePersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemovePersistenceResponse(status = Some(status)))
        }
    override def getDeduplication(request: pb.GetDeduplicationRequest): Future[pb.GetDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val deduplication = Option(adminClient.topicPolicies(request.isGlobal).getDeduplicationStatus(request.topic, false)) match
                case None =>
                    pb.GetDeduplicationResponse.Deduplication.Unspecified(new pb.DeduplicationUnspecified())
                case Some(v) =>
                    pb.GetDeduplicationResponse.Deduplication.Specified(new pb.DeduplicationSpecified(enabled = v))

            Future.successful(pb.GetDeduplicationResponse(
                status = Some(Status(code = Code.OK.index)),
                deduplication
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetDeduplicationResponse(status = Some(status)))
        }
    override def setDeduplication(request: pb.SetDeduplicationRequest): Future[pb.SetDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting deduplication policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setDeduplicationStatus(request.topic, request.enabled)
            Future.successful(pb.SetDeduplicationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetDeduplicationResponse(status = Some(status)))
        }
    override def removeDeduplication(request: pb.RemoveDeduplicationRequest): Future[pb.RemoveDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing deduplication policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDeduplicationStatus(request.topic)
            
            Future.successful(pb.RemoveDeduplicationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveDeduplicationResponse(status = Some(status)))
        }
    override def getDeduplicationSnapshotInterval(request: pb.GetDeduplicationSnapshotIntervalRequest): Future[pb.GetDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val interval = Option(adminClient.topicPolicies(request.isGlobal).getDeduplicationSnapshotInterval(request.topic)) match
                case None =>
                    pb.GetDeduplicationSnapshotIntervalResponse.Interval.Disabled(new pb.DeduplicationSnapshotIntervalDisabled())
                case Some(v) =>
                    pb.GetDeduplicationSnapshotIntervalResponse.Interval.Enabled(new pb.DeduplicationSnapshotIntervalEnabled(interval = v))

            Future.successful(pb.GetDeduplicationSnapshotIntervalResponse(
                status = Some(Status(code = Code.OK.index)),
                interval
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }
    override def setDeduplicationSnapshotInterval(request: pb.SetDeduplicationSnapshotIntervalRequest): Future[pb.SetDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting deduplication snapshot interval policy for topic ${request.topic}. ${request.interval}")
            adminClient.topicPolicies(request.isGlobal).setDeduplicationSnapshotInterval(request.topic, request.interval)
            
            Future.successful(pb.SetDeduplicationSnapshotIntervalResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }
    override def removeDeduplicationSnapshotInterval(request: pb.RemoveDeduplicationSnapshotIntervalRequest): Future[pb.RemoveDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing deduplication snapshot interval policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDeduplicationSnapshotInterval(request.topic)
            
            Future.successful(pb.RemoveDeduplicationSnapshotIntervalResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }
    override def getDispatchRate(request: pb.GetDispatchRateRequest): Future[pb.GetDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val dispatchRatePb = Option(adminClient.topicPolicies(request.isGlobal).getDispatchRate(request.topic, false)) match
                case None =>
                    pb.GetDispatchRateResponse.DispatchRate.Unspecified(new pb.DispatchRateUnspecified())
                case Some(v) =>
                    pb.GetDispatchRateResponse.DispatchRate.Specified(
                        new pb.DispatchRateSpecified(
                            rateInMsg = v.getDispatchThrottlingRateInMsg,
                            rateInByte = v.getDispatchThrottlingRateInByte,
                            periodInSecond = v.getRatePeriodInSecond,
                            isRelativeToPublishRate = v.isRelativeToPublishRate
                        )
                    )

            Future.successful(pb.GetDispatchRateResponse(
                status = Some(Status(code = Code.OK.index)),
                dispatchRate = dispatchRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetDispatchRateResponse(status = Some(status)))
        }
    override def setDispatchRate(request: pb.SetDispatchRateRequest): Future[pb.SetDispatchRateResponse] =
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
            Future.successful(pb.SetDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetDispatchRateResponse(status = Some(status)))
        }
    override def removeDispatchRate(request: pb.RemoveDispatchRateRequest): Future[pb.RemoveDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing dispatch rate policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeDispatchRate(request.topic)
            
            Future.successful(pb.RemoveDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveDispatchRateResponse(status = Some(status)))
        }
    override def getReplicatorDispatchRate(request: pb.GetReplicatorDispatchRateRequest): Future[pb.GetReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val replicatorDispatchRatePb = Option(adminClient.topicPolicies(request.isGlobal).getReplicatorDispatchRate(request.topic, false)) match
                case None =>
                    pb.GetReplicatorDispatchRateResponse.ReplicatorDispatchRate.Unspecified(new pb.ReplicatorDispatchRateUnspecified())
                case Some(v) =>
                    pb.GetReplicatorDispatchRateResponse.ReplicatorDispatchRate.Specified(
                        new pb.ReplicatorDispatchRateSpecified(
                            rateInMsg = Option(v.getDispatchThrottlingRateInMsg).getOrElse(0),
                            rateInByte = Option(v.getDispatchThrottlingRateInByte).getOrElse(0),
                            periodInSecond = Option(v.getRatePeriodInSecond).getOrElse(0),
                            isRelativeToPublishRate = Option(v.isRelativeToPublishRate).getOrElse(false)
                        )
                    )

            Future.successful(pb.GetReplicatorDispatchRateResponse(
                status = Some(Status(code = Code.OK.index)),
                replicatorDispatchRate = replicatorDispatchRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetReplicatorDispatchRateResponse(status = Some(status)))
        }
    override def setReplicatorDispatchRate(request: pb.SetReplicatorDispatchRateRequest): Future[pb.SetReplicatorDispatchRateResponse] =
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
            Future.successful(pb.SetReplicatorDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetReplicatorDispatchRateResponse(status = Some(status)))
        }
    override def removeReplicatorDispatchRate(request: pb.RemoveReplicatorDispatchRateRequest): Future[pb.RemoveReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing replicator dispatch rate for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeReplicatorDispatchRate(request.topic)
            
            Future.successful(pb.RemoveReplicatorDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveReplicatorDispatchRateResponse(status = Some(status)))
        }
    override def getSubscriptionDispatchRate(request: pb.GetSubscriptionDispatchRateRequest): Future[pb.GetSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscriptionDispatchRatePb = Option(adminClient.topicPolicies(request.isGlobal).getSubscriptionDispatchRate(request.topic, false)) match
                case None =>
                    pb.GetSubscriptionDispatchRateResponse.SubscriptionDispatchRate.Unspecified(new pb.SubscriptionDispatchRateUnspecified())
                case Some(v) =>
                    pb.GetSubscriptionDispatchRateResponse.SubscriptionDispatchRate.Specified(
                        new pb.SubscriptionDispatchRateSpecified(
                            rateInMsg = Option(v.getDispatchThrottlingRateInMsg).getOrElse(0),
                            rateInByte = Option(v.getDispatchThrottlingRateInByte).getOrElse(0),
                            periodInSecond = Option(v.getRatePeriodInSecond).getOrElse(0),
                            isRelativeToPublishRate = Option(v.isRelativeToPublishRate).getOrElse(false)
                        )
                    )

            Future.successful(pb.GetSubscriptionDispatchRateResponse(
                status = Some(Status(code = Code.OK.index)),
                subscriptionDispatchRate = subscriptionDispatchRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetSubscriptionDispatchRateResponse(status = Some(status)))
        }
    override def setSubscriptionDispatchRate(request: pb.SetSubscriptionDispatchRateRequest): Future[pb.SetSubscriptionDispatchRateResponse] =
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
            Future.successful(pb.SetSubscriptionDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetSubscriptionDispatchRateResponse(status = Some(status)))
        }
    override def removeSubscriptionDispatchRate(request: pb.RemoveSubscriptionDispatchRateRequest): Future[pb.RemoveSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscription dispatch rate for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSubscriptionDispatchRate(request.topic)
            
            Future.successful(pb.RemoveSubscriptionDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveSubscriptionDispatchRateResponse(status = Some(status)))
        }
    override def getCompactionThreshold(request: pb.GetCompactionThresholdRequest): Future[pb.GetCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val threshold = Option(adminClient.topicPolicies(request.isGlobal).getCompactionThreshold(request.topic, false)).map(_.toLong) match
                case None => pb.GetCompactionThresholdResponse.Threshold.Disabled(new pb.CompactionThresholdDisabled())
                case Some(v) => pb.GetCompactionThresholdResponse.Threshold.Enabled(new pb.CompactionThresholdEnabled(threshold = v))
            Future.successful(pb.GetCompactionThresholdResponse(
                status = Some(Status(code = Code.OK.index)),
                threshold
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetCompactionThresholdResponse(status = Some(status)))
        }
    override def setCompactionThreshold(request: pb.SetCompactionThresholdRequest): Future[pb.SetCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting compaction threshold policy for topic ${request.topic}. ${request.threshold}")
            adminClient.topicPolicies(request.isGlobal).setCompactionThreshold(request.topic, request.threshold)
            
            Future.successful(pb.SetCompactionThresholdResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetCompactionThresholdResponse(status = Some(status)))
        }
    override def removeCompactionThreshold(request: pb.RemoveCompactionThresholdRequest): Future[pb.RemoveCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing compaction threshold policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeCompactionThreshold(request.topic)
            
            Future.successful(pb.RemoveCompactionThresholdResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveCompactionThresholdResponse(status = Some(status)))
        }
    override def getPublishRate(request: pb.GetPublishRateRequest): Future[pb.GetPublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val publishRatePb = Option(adminClient.topicPolicies(request.isGlobal).getPublishRate(request.topic)) match
                case None =>
                    pb.GetPublishRateResponse.PublishRate.Unspecified(new pb.PublishRateUnspecified)
                case Some(v) =>
                    pb.GetPublishRateResponse.PublishRate.Specified(
                        new pb.PublishRateSpecified(
                            rateInMsg = Option(v.publishThrottlingRateInMsg).getOrElse(0),
                            rateInByte = Option(v.publishThrottlingRateInByte).getOrElse(0)
                        )
                    )

            Future.successful(pb.GetPublishRateResponse(
                status = Some(Status(code = Code.OK.index)),
                publishRate = publishRatePb
            ))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetPublishRateResponse(status = Some(status)))
        }
    override def setPublishRate(request: pb.SetPublishRateRequest): Future[pb.SetPublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting publish rate policy for topic ${request.topic}. ${request.rateInMsg}, ${request.rateInByte}")
            val publishRate = PublishRate( request.rateInMsg, request.rateInByte )
            adminClient.topicPolicies(request.isGlobal).setPublishRate(request.topic, publishRate)
            
            Future.successful(pb.SetPublishRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetPublishRateResponse(status = Some(status)))
        }
    override def removePublishRate(request: pb.RemovePublishRateRequest): Future[pb.RemovePublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing publish rate policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removePublishRate(request.topic)
            
            Future.successful(pb.RemovePublishRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemovePublishRateResponse(status = Some(status)))
        }
    override def getMaxConsumersPerSubscription(request: pb.GetMaxConsumersPerSubscriptionRequest): Future[pb.GetMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxConsumersPerSubscriptionPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxConsumersPerSubscription(request.topic)) match
                case None =>
                    pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscription.Unspecified(new pb.MaxConsumersPerSubscriptionUnspecified())
                case Some(v) =>
                    pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscription.Specified(
                        new pb.MaxConsumersPerSubscriptionSpecified(
                            maxConsumersPerSubscription = v
                        )
                    )

            Future.successful(
                pb.GetMaxConsumersPerSubscriptionResponse(
                    status = Some(Status(code = Code.OK.index)),
                    maxConsumersPerSubscription = maxConsumersPerSubscriptionPb
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }
    override def setMaxConsumersPerSubscription(request: pb.SetMaxConsumersPerSubscriptionRequest): Future[pb.SetMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max consumers per subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxConsumersPerSubscription(request.topic, request.maxConsumersPerSubscription)
            
            Future.successful(pb.SetMaxConsumersPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }
    override def removeMaxConsumersPerSubscription(request: pb.RemoveMaxConsumersPerSubscriptionRequest): Future[pb.RemoveMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max consumers per subscription policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxConsumersPerSubscription(request.topic)
            
            Future.successful(pb.RemoveMaxConsumersPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }
    override def getMaxProducers(request: pb.GetMaxProducersRequest): Future[pb.GetMaxProducersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxProducersPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxProducers(request.topic, false)) match
                case None =>
                    pb.GetMaxProducersResponse.MaxProducers.Unspecified(new pb.MaxProducersUnspecified())
                case Some(v) =>
                    pb.GetMaxProducersResponse.MaxProducers.Specified(new pb.MaxProducersSpecified(
                        maxProducers = v
                    ))

            Future.successful(
                pb.GetMaxProducersResponse(
                    status = Some(Status(code = Code.OK.index)),
                    maxProducers = maxProducersPb
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMaxProducersResponse(status = Some(status)))
        }
    override def setMaxProducers(request: pb.SetMaxProducersRequest): Future[pb.SetMaxProducersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max producers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxProducers(request.topic, request.maxProducers)
            
            Future.successful(pb.SetMaxProducersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMaxProducersResponse(status = Some(status)))
        }
    override def removeMaxProducers(request: pb.RemoveMaxProducersRequest): Future[pb.RemoveMaxProducersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max producers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxProducers(request.topic)
            
            Future.successful(pb.RemoveMaxProducersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMaxProducersResponse(status = Some(status)))
        }
    override def getMaxSubscriptionsPerTopic(request: pb.GetMaxSubscriptionsPerTopicRequest): Future[pb.GetMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxSubscriptionsPerTopicPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxSubscriptionsPerTopic(request.topic)) match
                case None =>
                    pb.GetMaxSubscriptionsPerTopicResponse.MaxSubscriptionsPerTopic.Unspecified(new pb.MaxSubscriptionsPerTopicUnspecified())
                case Some(v) =>
                    pb.GetMaxSubscriptionsPerTopicResponse.MaxSubscriptionsPerTopic.Specified(
                        new pb.MaxSubscriptionsPerTopicSpecified(
                            maxSubscriptionsPerTopic = v
                        )
                    )

            Future.successful(
                pb.GetMaxSubscriptionsPerTopicResponse(
                    status = Some(Status(code = Code.OK.index)),
                    maxSubscriptionsPerTopic = maxSubscriptionsPerTopicPb
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }
    override def setMaxSubscriptionsPerTopic(request: pb.SetMaxSubscriptionsPerTopicRequest): Future[pb.SetMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max subscriptions per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxSubscriptionsPerTopic(request.topic, request.maxSubscriptionsPerTopic)
            
            Future.successful(pb.SetMaxSubscriptionsPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }
    override def removeMaxSubscriptionsPerTopic(request: pb.RemoveMaxSubscriptionsPerTopicRequest): Future[pb.RemoveMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max subscriptions per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxSubscriptionsPerTopic(request.topic)
            
            Future.successful(pb.RemoveMaxSubscriptionsPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }
    override def getMaxConsumers(request: pb.GetMaxConsumersRequest): Future[pb.GetMaxConsumersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxConsumersPb = Option(adminClient.topicPolicies(request.isGlobal).getMaxConsumers(request.topic, false)) match
                case None =>
                    pb.GetMaxConsumersResponse.MaxConsumers.Unspecified(new pb.MaxConsumersUnspecified())
                case Some(v) =>
                    pb.GetMaxConsumersResponse.MaxConsumers.Specified(
                        new pb.MaxConsumersSpecified(
                            maxConsumers = v
                        )
                    )

            Future.successful(
                pb.GetMaxConsumersResponse(
                    status = Some(Status(code = Code.OK.index)),
                    maxConsumers = maxConsumersPb
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMaxConsumersResponse(status = Some(status)))
        }
    override def setMaxConsumers(request: pb.SetMaxConsumersRequest): Future[pb.SetMaxConsumersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max consumers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).setMaxConsumers(request.topic, request.maxConsumers)
            
            Future.successful(pb.SetMaxConsumersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMaxConsumersResponse(status = Some(status)))
        }
    override def removeMaxConsumers(request: pb.RemoveMaxConsumersRequest): Future[pb.RemoveMaxConsumersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max consumers per topic policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxConsumers(request.topic)
            
            Future.successful(pb.RemoveMaxConsumersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMaxConsumersResponse(status = Some(status)))
        }
    override def getSubscriptionTypesEnabled(request: pb.GetSubscriptionTypesEnabledRequest): Future[pb.GetSubscriptionTypesEnabledResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def subscriptionTypeToPb(subscriptionType: SubscriptionType): pb.SubscriptionType =
            subscriptionType match
                case SubscriptionType.Exclusive => pb.SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE
                case SubscriptionType.Failover => pb.SubscriptionType.SUBSCRIPTION_TYPE_FAILOVER
                case SubscriptionType.Shared => pb.SubscriptionType.SUBSCRIPTION_TYPE_SHARED
                case SubscriptionType.Key_Shared => pb.SubscriptionType.SUBSCRIPTION_TYPE_KEY_SHARED

        try {
            def inherited = pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabled.Inherited(new pb.SubscriptionTypesEnabledInherited())
            val subscriptionTypesEnabledPb = Option(adminClient.topicPolicies(request.isGlobal).getSubscriptionTypesEnabled(request.topic)) match
                case None => inherited
                case Some(v) if v.size() == 0 => inherited
                case Some(v) =>
                    pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabled.Specified(
                        new pb.SubscriptionTypesEnabledSpecified(
                            types = v.asScala.map(subscriptionTypeToPb).toSeq
                        )
                    )
            Future.successful(
                pb.GetSubscriptionTypesEnabledResponse(
                    status = Some(Status(code = Code.OK.index)),
                    subscriptionTypesEnabled = subscriptionTypesEnabledPb
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetSubscriptionTypesEnabledResponse(status = Some(status)))
        }
    override def setSubscriptionTypesEnabled(request: pb.SetSubscriptionTypesEnabledRequest): Future[pb.SetSubscriptionTypesEnabledResponse] =
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
            
            Future.successful(pb.SetSubscriptionTypesEnabledResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetSubscriptionTypesEnabledResponse(status = Some(status)))
        }
    override def removeSubscriptionTypesEnabled(request: pb.RemoveSubscriptionTypesEnabledRequest): Future[pb.RemoveSubscriptionTypesEnabledResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscription types enabled policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSubscriptionTypesEnabled(request.topic)
            
            Future.successful(pb.RemoveSubscriptionTypesEnabledResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveSubscriptionTypesEnabledResponse(status = Some(status)))
        }
    override def getSubscribeRate(request: pb.GetSubscribeRateRequest): Future[pb.GetSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscribeRatePb = Option(adminClient.topicPolicies(request.isGlobal).getSubscribeRate(request.topic, false)) match
                case None =>
                    pb.GetSubscribeRateResponse.SubscribeRate.Unspecified(new pb.SubscribeRateUnspecified())
                case Some(v) =>
                    pb.GetSubscribeRateResponse.SubscribeRate.Specified(
                        new pb.SubscribeRateSpecified(
                            subscribeThrottlingRatePerConsumer = Option(v.subscribeThrottlingRatePerConsumer).getOrElse(0),
                            ratePeriodInSeconds = Option(v.ratePeriodInSecond).getOrElse(0)
                        )
                    )

            Future.successful(
                pb.GetSubscribeRateResponse(
                    status = Some(Status(code = Code.OK.index)),
                    subscribeRate = subscribeRatePb
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetSubscribeRateResponse(status = Some(status)))
        }
    override def setSubscribeRate(request: pb.SetSubscribeRateRequest): Future[pb.SetSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting subscribe rate policy for topic ${request.topic}")
            val subscribeRate = new SubscribeRate(request.subscribeThrottlingRatePerConsumer, request.ratePeriodInSeconds)

            adminClient.topicPolicies(request.isGlobal).setSubscribeRate(request.topic, subscribeRate)
            Future.successful(pb.SetSubscribeRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetSubscribeRateResponse(status = Some(status)))
        }
    override def removeSubscribeRate(request: pb.RemoveSubscribeRateRequest): Future[pb.RemoveSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscribe rate policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSubscribeRate(request.topic)
            Future.successful(pb.RemoveSubscribeRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveSubscribeRateResponse(status = Some(status)))
        }
    override def getSchemaCompatibilityStrategy(request: pb.GetSchemaCompatibilityStrategyRequest): Future[pb.GetSchemaCompatibilityStrategyResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val strategy = Option(adminClient.topicPolicies(request.isGlobal).getSchemaCompatibilityStrategy(request.topic, false)) match
                case None =>
                    pb.GetSchemaCompatibilityStrategyResponse.Strategy.Inherited(new pb.SchemaCompatibilityStrategyInherited())
                case Some(v) =>
                    pb.GetSchemaCompatibilityStrategyResponse.Strategy.Specified(new pb.SchemaCompatibilityStrategySpecified(
                        strategy = schemaCompatibilityStrategyToPb(v)
                    ))
            val status = Status(code = Code.OK.index)
            Future.successful(
                pb.GetSchemaCompatibilityStrategyResponse(
                    status = Some(status),
                    strategy = strategy
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetSchemaCompatibilityStrategyResponse(status = Some(status)))
        }
    override def setSchemaCompatibilityStrategy(request: pb.SetSchemaCompatibilityStrategyRequest): Future[pb.SetSchemaCompatibilityStrategyResponse] =
        logger.info(s"Setting schema compatibility strategy policy for topic ${request.topic}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.topicPolicies(request.isGlobal).setSchemaCompatibilityStrategy(request.topic, schemaCompatibilityStrategyFromPb(request.strategy))
            val status = Status(code = Code.OK.index)
            Future.successful(pb.SetSchemaCompatibilityStrategyResponse(status = Some(status)))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetSchemaCompatibilityStrategyResponse(status = Some(status)))
        }
    override def removeSchemaCompatibilityStrategy(request: pb.RemoveSchemaCompatibilityStrategyRequest): Future[pb.RemoveSchemaCompatibilityStrategyResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing schema compatibility strategy policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeSchemaCompatibilityStrategy(request.topic)
            Future.successful(pb.RemoveSchemaCompatibilityStrategyResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveSchemaCompatibilityStrategyResponse(status = Some(status)))
        }
    override def getMaxMessageSize(request: pb.GetMaxMessageSizeRequest): Future[pb.GetMaxMessageSizeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxMessageSize = Option(adminClient.topicPolicies(request.isGlobal).getMaxMessageSize(request.topic)).map(_.toInt) match
                case None => pb.GetMaxMessageSizeResponse.MaxMessageSize.Disabled(new pb.MaxMessageSizeDisabled())
                case Some(v) => pb.GetMaxMessageSizeResponse.MaxMessageSize.Enabled(new pb.MaxMessageSizeEnabled(maxMessageSize = v))
            
            Future.successful(
                pb.GetMaxMessageSizeResponse(
                    status = Some(Status(code = Code.OK.index)),
                    maxMessageSize
                )
            )
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.GetMaxMessageSizeResponse(status = Some(status)))
        }
    override def setMaxMessageSize(request: pb.SetMaxMessageSizeRequest): Future[pb.SetMaxMessageSizeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max message size policy for topic ${request.topic}. ${request.maxMessageSize}")
            adminClient.topicPolicies(request.isGlobal).setMaxMessageSize(request.topic, request.maxMessageSize)
            
            Future.successful(pb.SetMaxMessageSizeResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.SetMaxMessageSizeResponse(status = Some(status)))
        }
    override def removeMaxMessageSize(request: pb.RemoveMaxMessageSizeRequest): Future[pb.RemoveMaxMessageSizeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max message size policy for topic ${request.topic}")
            adminClient.topicPolicies(request.isGlobal).removeMaxMessageSize(request.topic)
            
            Future.successful(pb.RemoveMaxMessageSizeResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err: Exception =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.RemoveMaxMessageSizeResponse(status = Some(status)))
        }
