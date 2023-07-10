package namespace

import com.tools.teal.pulsar.ui.namespace.v1.namespace.{CompactionThresholdEnabled, CreateNamespaceRequest, CreateNamespaceResponse, DeduplicationSnapshotIntervalDisabled, DeduplicationSnapshotIntervalEnabled, DeduplicationSpecified, DeduplicationUnspecified, DelayedDeliverySpecified, DelayedDeliveryUnspecified, DeleteNamespaceRequest, DeleteNamespaceResponse, DispatchRateSpecified, DispatchRateUnspecified, GetAntiAffinityNamespacesRequest, GetAntiAffinityNamespacesResponse, GetAutoSubscriptionCreationRequest, GetAutoSubscriptionCreationResponse, GetAutoTopicCreationRequest, GetAutoTopicCreationResponse, GetBacklogQuotasRequest, GetBacklogQuotasResponse, GetBookieAffinityGroupRequest, GetBookieAffinityGroupResponse, GetCompactionThresholdRequest, GetCompactionThresholdResponse, GetDeduplicationRequest, GetDeduplicationResponse, GetDeduplicationSnapshotIntervalRequest, GetDeduplicationSnapshotIntervalResponse, GetDelayedDeliveryRequest, GetDelayedDeliveryResponse, GetDispatchRateRequest, GetDispatchRateResponse, GetEncryptionRequiredRequest, GetEncryptionRequiredResponse, GetInactiveTopicPoliciesRequest, GetInactiveTopicPoliciesResponse, GetIsAllowAutoUpdateSchemaRequest, GetIsAllowAutoUpdateSchemaResponse, GetMaxConsumersPerSubscriptionRequest, GetMaxConsumersPerSubscriptionResponse, GetMaxConsumersPerTopicRequest, GetMaxConsumersPerTopicResponse, GetMaxProducersPerTopicRequest, GetMaxProducersPerTopicResponse, GetMaxSubscriptionsPerTopicRequest, GetMaxSubscriptionsPerTopicResponse, GetMaxTopicsPerNamespaceRequest, GetMaxTopicsPerNamespaceResponse, GetMaxUnackedMessagesPerConsumerRequest, GetMaxUnackedMessagesPerConsumerResponse, GetMaxUnackedMessagesPerSubscriptionRequest, GetMaxUnackedMessagesPerSubscriptionResponse, GetMessageTtlRequest, GetMessageTtlResponse, GetNamespaceAntiAffinityGroupRequest, GetNamespaceAntiAffinityGroupResponse, GetOffloadDeletionLagRequest, GetOffloadDeletionLagResponse, GetOffloadPoliciesRequest, GetOffloadPoliciesResponse, GetOffloadThresholdRequest, GetOffloadThresholdResponse, GetPermissionOnSubscriptionRequest, GetPermissionOnSubscriptionResponse, GetPermissionsRequest, GetPermissionsResponse, GetPersistenceRequest, GetPersistenceResponse, GetPropertiesRequest, GetPropertiesResponse, GetPublishRateRequest, GetPublishRateResponse, GetReplicationClustersRequest, GetReplicationClustersResponse, GetReplicatorDispatchRateRequest, GetReplicatorDispatchRateResponse, GetResourceGroupRequest, GetResourceGroupResponse, GetRetentionRequest, GetRetentionResponse, GetSchemaCompatibilityStrategyRequest, GetSchemaCompatibilityStrategyResponse, GetSchemaValidationEnforceRequest, GetSchemaValidationEnforceResponse, GetSubscribeRateRequest, GetSubscribeRateResponse, GetSubscriptionAuthModeRequest, GetSubscriptionAuthModeResponse, GetSubscriptionDispatchRateRequest, GetSubscriptionDispatchRateResponse, GetSubscriptionExpirationTimeRequest, GetSubscriptionExpirationTimeResponse, GetSubscriptionTypesEnabledRequest, GetSubscriptionTypesEnabledResponse, GetTopicsCountRequest, GetTopicsCountResponse, GrantPermissionOnSubscriptionRequest, GrantPermissionOnSubscriptionResponse, GrantPermissionsRequest, GrantPermissionsResponse, InactiveTopicPoliciesDeleteMode, InactiveTopicPoliciesSpecified, InactiveTopicPoliciesUnspecified, ListNamespacesRequest, ListNamespacesResponse, MaxConsumersPerSubscriptionSpecified, MaxConsumersPerSubscriptionUnspecified, MaxConsumersPerTopicSpecified, MaxConsumersPerTopicUnspecified, MaxProducersPerTopicSpecified, MaxProducersPerTopicUnspecified, MaxSubscriptionsPerTopicSpecified, MaxSubscriptionsPerTopicUnspecified, MaxTopicsPerNamespaceSpecified, MaxTopicsPerNamespaceUnspecified, MaxUnackedMessagesPerConsumerSpecified, MaxUnackedMessagesPerConsumerUnspecified, MaxUnackedMessagesPerSubscriptionSpecified, MaxUnackedMessagesPerSubscriptionUnspecified, MessageTtlSpecified, MessageTtlUnspecified, NamespaceServiceGrpc, OffloadDeletionLagSpecified, OffloadDeletionLagUnspecified, OffloadThresholdSpecified, PersistenceSpecified, PersistenceUnspecified, PublishRateSpecified, PublishRateUnspecified, RemoveAutoSubscriptionCreationRequest, RemoveAutoSubscriptionCreationResponse, RemoveAutoTopicCreationRequest, RemoveAutoTopicCreationResponse, RemoveBacklogQuotaRequest, RemoveBacklogQuotaResponse, RemoveBookieAffinityGroupRequest, RemoveBookieAffinityGroupResponse, RemoveCompactionThresholdRequest, RemoveCompactionThresholdResponse, RemoveDeduplicationRequest, RemoveDeduplicationResponse, RemoveDeduplicationSnapshotIntervalRequest, RemoveDeduplicationSnapshotIntervalResponse, RemoveDelayedDeliveryRequest, RemoveDelayedDeliveryResponse, RemoveDispatchRateRequest, RemoveDispatchRateResponse, RemoveInactiveTopicPoliciesRequest, RemoveInactiveTopicPoliciesResponse, RemoveMaxConsumersPerSubscriptionRequest, RemoveMaxConsumersPerSubscriptionResponse, RemoveMaxConsumersPerTopicRequest, RemoveMaxConsumersPerTopicResponse, RemoveMaxProducersPerTopicRequest, RemoveMaxProducersPerTopicResponse, RemoveMaxSubscriptionsPerTopicRequest, RemoveMaxSubscriptionsPerTopicResponse, RemoveMaxTopicsPerNamespaceRequest, RemoveMaxTopicsPerNamespaceResponse, RemoveMaxUnackedMessagesPerConsumerRequest, RemoveMaxUnackedMessagesPerConsumerResponse, RemoveMaxUnackedMessagesPerSubscriptionRequest, RemoveMaxUnackedMessagesPerSubscriptionResponse, RemoveMessageTtlRequest, RemoveMessageTtlResponse, RemoveNamespaceAntiAffinityGroupRequest, RemoveNamespaceAntiAffinityGroupResponse, RemoveOffloadDeletionLagRequest, RemoveOffloadDeletionLagResponse, RemoveOffloadPoliciesRequest, RemoveOffloadPoliciesResponse, RemovePersistenceRequest, RemovePersistenceResponse, RemovePublishRateRequest, RemovePublishRateResponse, RemoveReplicatorDispatchRateRequest, RemoveReplicatorDispatchRateResponse, RemoveResourceGroupRequest, RemoveResourceGroupResponse, RemoveRetentionRequest, RemoveRetentionResponse, RemoveSubscribeRateRequest, RemoveSubscribeRateResponse, RemoveSubscriptionDispatchRateRequest, RemoveSubscriptionDispatchRateResponse, RemoveSubscriptionExpirationTimeRequest, RemoveSubscriptionExpirationTimeResponse, RemoveSubscriptionTypesEnabledRequest, RemoveSubscriptionTypesEnabledResponse, ReplicatorDispatchRateSpecified, ReplicatorDispatchRateUnspecified, ResourceGroupSpecified, ResourceGroupUnspecified, RetentionSpecified, RetentionUnspecified, RevokePermissionOnSubscriptionRequest, RevokePermissionOnSubscriptionResponse, RevokePermissionsRequest, RevokePermissionsResponse, SetAutoSubscriptionCreationRequest, SetAutoSubscriptionCreationResponse, SetAutoTopicCreationRequest, SetAutoTopicCreationResponse, SetBacklogQuotasRequest, SetBacklogQuotasResponse, SetBookieAffinityGroupRequest, SetBookieAffinityGroupResponse, SetCompactionThresholdRequest, SetCompactionThresholdResponse, SetDeduplicationRequest, SetDeduplicationResponse, SetDeduplicationSnapshotIntervalRequest, SetDeduplicationSnapshotIntervalResponse, SetDelayedDeliveryRequest, SetDelayedDeliveryResponse, SetDispatchRateRequest, SetDispatchRateResponse, SetEncryptionRequiredRequest, SetEncryptionRequiredResponse, SetInactiveTopicPoliciesRequest, SetInactiveTopicPoliciesResponse, SetIsAllowAutoUpdateSchemaRequest, SetIsAllowAutoUpdateSchemaResponse, SetMaxConsumersPerSubscriptionRequest, SetMaxConsumersPerSubscriptionResponse, SetMaxConsumersPerTopicRequest, SetMaxConsumersPerTopicResponse, SetMaxProducersPerTopicRequest, SetMaxProducersPerTopicResponse, SetMaxSubscriptionsPerTopicRequest, SetMaxSubscriptionsPerTopicResponse, SetMaxTopicsPerNamespaceRequest, SetMaxTopicsPerNamespaceResponse, SetMaxUnackedMessagesPerConsumerRequest, SetMaxUnackedMessagesPerConsumerResponse, SetMaxUnackedMessagesPerSubscriptionRequest, SetMaxUnackedMessagesPerSubscriptionResponse, SetMessageTtlRequest, SetMessageTtlResponse, SetNamespaceAntiAffinityGroupRequest, SetNamespaceAntiAffinityGroupResponse, SetOffloadDeletionLagRequest, SetOffloadDeletionLagResponse, SetOffloadPoliciesRequest, SetOffloadPoliciesResponse, SetOffloadThresholdRequest, SetOffloadThresholdResponse, SetPersistenceRequest, SetPersistenceResponse, SetPropertiesRequest, SetPropertiesResponse, SetPublishRateRequest, SetPublishRateResponse, SetReplicationClustersRequest, SetReplicationClustersResponse, SetReplicatorDispatchRateRequest, SetReplicatorDispatchRateResponse, SetResourceGroupRequest, SetResourceGroupResponse, SetRetentionRequest, SetRetentionResponse, SetSchemaCompatibilityStrategyRequest, SetSchemaCompatibilityStrategyResponse, SetSchemaValidationEnforceRequest, SetSchemaValidationEnforceResponse, SetSubscribeRateRequest, SetSubscribeRateResponse, SetSubscriptionAuthModeRequest, SetSubscriptionAuthModeResponse, SetSubscriptionDispatchRateRequest, SetSubscriptionDispatchRateResponse, SetSubscriptionExpirationTimeRequest, SetSubscriptionExpirationTimeResponse, SetSubscriptionTypesEnabledRequest, SetSubscriptionTypesEnabledResponse, SubscribeRateSpecified, SubscribeRateUnspecified, SubscriptionDispatchRateSpecified, SubscriptionDispatchRateUnspecified, SubscriptionExpirationTimeSpecified, SubscriptionExpirationTimeUnspecified, SubscriptionTypesEnabledInherited, SubscriptionTypesEnabledSpecified}
import com.tools.teal.pulsar.ui.namespace.v1.namespace as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import org.apache.pulsar.client.api.SubscriptionType
import org.apache.pulsar.common.policies.data.BacklogQuota.{BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder}
import org.apache.pulsar.common.policies.data.{AuthAction, AutoSubscriptionCreationOverride, AutoTopicCreationOverride, BookieAffinityGroupData, BundlesData, DelayedDeliveryPolicies, DispatchRate, InactiveTopicDeleteMode, InactiveTopicPolicies, OffloadPolicies, OffloadedReadPriority, PersistencePolicies, Policies, PublishRate, RetentionPolicies, SubscribeRate, SubscriptionAuthMode}
import pulsar_auth.RequestContext

import java.util.concurrent.TimeUnit
import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import scala.concurrent.{Await, ExecutionContext, Future}
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.Duration

class NamespaceServiceImpl extends NamespaceServiceGrpc.NamespaceService:
    val logger: Logger = Logger(getClass.getName)

    override def createNamespace(request: CreateNamespaceRequest): Future[CreateNamespaceResponse] =
        logger.info(s"Creating namespace ${request.namespaceName}")
        val adminClient = RequestContext.pulsarAdmin.get()

        val bundlesData = BundlesData.builder.numBundles(request.numBundles).build
        val policies = new Policies
        policies.bundles = bundlesData
        policies.replication_clusters = request.replicationClusters.toSet.asJava

        try {
            adminClient.namespaces.createNamespace(request.namespaceName)

            val status = Status(code = Code.OK.index)
            Future.successful(CreateNamespaceResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateNamespaceResponse(status = Some(status)))
        }

    override def deleteNamespace(request: DeleteNamespaceRequest): Future[DeleteNamespaceResponse] =
        logger.info(s"Deleting namespace ${request.namespaceName}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.deleteNamespace(request.namespaceName, request.force)

            val status = Status(code = Code.OK.index)
            Future.successful(DeleteNamespaceResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteNamespaceResponse(status = Some(status)))
        }

    override def listNamespaces(request: ListNamespacesRequest): Future[ListNamespacesResponse] =
        logger.debug(s"List namespaces. Tenant: ${request.tenant}")
        val adminClient = RequestContext.pulsarAdmin.get()

        val namespaces = try {
            adminClient.namespaces.getNamespaces(request.tenant).asScala
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(pb.ListNamespacesResponse(status = Some(status)))
        }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.ListNamespacesResponse(status = Some(status), namespaces = namespaces.toSeq))


    override def getTopicsCount(request: GetTopicsCountRequest): Future[GetTopicsCountResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        try {
            val options = org.apache.pulsar.client.admin.ListNamespaceTopicsOptions.builder
                .includeSystemTopic(request.isIncludeSystemTopics)
                .mode(org.apache.pulsar.client.admin.Mode.ALL)
                .build

            val getTopicsFutures = request.namespaces.map(t => adminClient.namespaces.getTopicsAsync(t, options).asScala)
            val topicsPerNamespace = Await.result(Future.sequence(getTopicsFutures), Duration(1, TimeUnit.MINUTES)).map(_.asScala)

            val PartitionRegex = """(.*)(-partition-)(\d+)$""".r

            val topicsAndPartitionsCountsPerNamespace = topicsPerNamespace.map(topics => {
                val partitionsAndNonPartitionedTopicsCount = topics.size
                val partitionedAndNonPartitionedTopicsExcludingPartitions = topics
                    .map {
                        case PartitionRegex(topicFqn, _, _) => topicFqn
                        case topic => topic
                    }
                    .distinct
                    .size

                (partitionsAndNonPartitionedTopicsCount, partitionedAndNonPartitionedTopicsExcludingPartitions)
              })

            val topicsCountPerNamespace = topicsAndPartitionsCountsPerNamespace.map((x, y) => x + y)

            val topicsCountPerNamespaceExcludingPartitions = topicsAndPartitionsCountsPerNamespace.map(_._2)

            val status = Status(code = Code.OK.index)
            Future.successful(
                GetTopicsCountResponse(
                    status = Some(status),
                    topicsCount = request.namespaces.zip(topicsCountPerNamespace).toMap,
                    topicsCountExcludingPartitions = request.namespaces.zip(topicsCountPerNamespaceExcludingPartitions).toMap
                )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetTopicsCountResponse(status = Some(status)))
        }

    override def getIsAllowAutoUpdateSchema(request: GetIsAllowAutoUpdateSchemaRequest): Future[GetIsAllowAutoUpdateSchemaResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val isAllowAutoUpdateSchema = adminClient.namespaces.getIsAllowAutoUpdateSchema(request.namespace)
            val status = Status(code = Code.OK.index)
            Future.successful(
              GetIsAllowAutoUpdateSchemaResponse(
                status = Some(status),
                isAllowAutoUpdateSchema = isAllowAutoUpdateSchema
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetIsAllowAutoUpdateSchemaResponse(status = Some(status)))
        }

    override def setIsAllowAutoUpdateSchema(request: SetIsAllowAutoUpdateSchemaRequest): Future[SetIsAllowAutoUpdateSchemaResponse] =
        logger.info(s"Setting is allow auto update schema policy for namespace ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.setIsAllowAutoUpdateSchema(request.namespace, request.isAllowAutoUpdateSchema)
            val status = Status(code = Code.OK.index)
            Future.successful(SetIsAllowAutoUpdateSchemaResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetIsAllowAutoUpdateSchemaResponse(status = Some(status)))
        }

    override def getSchemaCompatibilityStrategy(request: GetSchemaCompatibilityStrategyRequest): Future[GetSchemaCompatibilityStrategyResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val strategy = adminClient.namespaces.getSchemaCompatibilityStrategy(request.namespace)
            val status = Status(code = Code.OK.index)
            Future.successful(
              GetSchemaCompatibilityStrategyResponse(
                status = Some(status),
                strategy = schemaCompatibilityStrategyToPb(strategy)
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSchemaCompatibilityStrategyResponse(status = Some(status)))

        }

    override def setSchemaCompatibilityStrategy(request: SetSchemaCompatibilityStrategyRequest): Future[SetSchemaCompatibilityStrategyResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        logger.info(s"Setting schema compatibility strategy policy for namespace ${request.namespace}")

        try {
            adminClient.namespaces.setSchemaCompatibilityStrategy(
              request.namespace,
              schemaCompatibilityStrategyFromPb(request.strategy)
            )
            val status = Status(code = Code.OK.index)
            Future.successful(SetSchemaCompatibilityStrategyResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSchemaCompatibilityStrategyResponse(status = Some(status)))

        }

    override def getSchemaValidationEnforce(request: GetSchemaValidationEnforceRequest): Future[GetSchemaValidationEnforceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val schemaValidationEnforced = adminClient.namespaces.getSchemaValidationEnforced(request.namespace)
            val status = Status(code = Code.OK.index)
            Future.successful(
              GetSchemaValidationEnforceResponse(
                status = Some(status),
                schemaValidationEnforced = schemaValidationEnforced
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSchemaValidationEnforceResponse(status = Some(status)))
        }

    override def setSchemaValidationEnforce(request: SetSchemaValidationEnforceRequest): Future[SetSchemaValidationEnforceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting schema validation enforce policy for namespace ${request.namespace}")
            adminClient.namespaces.setSchemaValidationEnforced(request.namespace, request.schemaValidationEnforced)
            val status = Status(code = Code.OK.index)
            Future.successful(SetSchemaValidationEnforceResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSchemaValidationEnforceResponse(status = Some(status)))

        }

    override def getAutoSubscriptionCreation(request: GetAutoSubscriptionCreationRequest): Future[GetAutoSubscriptionCreationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val autoSubscriptionCreationPb = Option(adminClient.namespaces.getAutoSubscriptionCreation(request.namespace)) match
                case Some(v) if v.isAllowAutoSubscriptionCreation  => pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_ENABLED
                case Some(v) if !v.isAllowAutoSubscriptionCreation => pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_DISABLED
                case _                                             => pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_INHERITED_FROM_BROKER_CONFIG

            Future.successful(
              GetAutoSubscriptionCreationResponse(
                status = Some(Status(code = Code.OK.index)),
                autoSubscriptionCreation = autoSubscriptionCreationPb
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetAutoSubscriptionCreationResponse(status = Some(status)))

        }

    override def setAutoSubscriptionCreation(request: SetAutoSubscriptionCreationRequest): Future[SetAutoSubscriptionCreationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting auto subscription creation policy for namespace ${request.namespace}")
            val autoSubscriptionCreationOverride = request.autoSubscriptionCreation match
                case pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_ENABLED =>
                    AutoSubscriptionCreationOverride.builder.allowAutoSubscriptionCreation(true).build()
                case pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_DISABLED =>
                    AutoSubscriptionCreationOverride.builder.allowAutoSubscriptionCreation(false).build()
                case _ =>
                    val status = Status(code = Code.INVALID_ARGUMENT.index, message = "Wrong allow subscription creation argument received")
                    return Future.successful(SetAutoSubscriptionCreationResponse(status = Some(status)))

            adminClient.namespaces.setAutoSubscriptionCreation(request.namespace, autoSubscriptionCreationOverride)
            Future.successful(SetAutoSubscriptionCreationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetAutoSubscriptionCreationResponse(status = Some(status)))

        }

    override def removeAutoSubscriptionCreation(request: RemoveAutoSubscriptionCreationRequest): Future[RemoveAutoSubscriptionCreationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing auto subscription creation policy for namespace ${request.namespace}")
            adminClient.namespaces.removeAutoSubscriptionCreation(request.namespace)
            Future.successful(RemoveAutoSubscriptionCreationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveAutoSubscriptionCreationResponse(status = Some(status)))
        }

    override def getAutoTopicCreation(request: GetAutoTopicCreationRequest): Future[GetAutoTopicCreationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val autoTopicCreationOverride = Option(adminClient.namespaces.getAutoTopicCreation(request.namespace))
            val autoTopicCreationOverridePb = autoTopicCreationOverride match
                case Some(v) =>
                    Some(
                      pb.AutoTopicCreationOverride(
                        isAllowTopicCreation = v.isAllowAutoTopicCreation,
                        topicType = v.getTopicType match
                            case "partitioned"     => pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_PARTITIONED
                            case "non-partitioned" => pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_NON_PARTITIONED
                            case _                 => pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_UNSPECIFIED
                        ,
                        defaultNumPartitions = v.getDefaultNumPartitions
                      )
                    )
                case _ => None
            val autoTopicCreationPb = autoTopicCreationOverride match
                case Some(_) => pb.AutoTopicCreation.AUTO_TOPIC_CREATION_SPECIFIED
                case _       => pb.AutoTopicCreation.AUTO_TOPIC_CREATION_INHERITED_FROM_BROKER_CONFIG

            Future.successful(
              GetAutoTopicCreationResponse(
                status = Some(Status(code = Code.OK.index)),
                autoTopicCreation = autoTopicCreationPb,
                autoTopicCreationOverride = autoTopicCreationOverridePb
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetAutoTopicCreationResponse(status = Some(status)))
        }

    override def setAutoTopicCreation(request: SetAutoTopicCreationRequest): Future[SetAutoTopicCreationResponse] =
        logger.info(s"Setting auto topic creation policy for namespace ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        if !request.autoTopicCreation.isAutoTopicCreationSpecified then
            val status = Status(code = Code.FAILED_PRECONDITION.index)
            return Future.successful(SetAutoTopicCreationResponse(status = Some(status)))

        val autoTopicCreationOverridePb = request.autoTopicCreationOverride match
            case Some(v) => v
            case _ =>
                val status = Status(code = Code.FAILED_PRECONDITION.index)
                return Future.successful(SetAutoTopicCreationResponse(status = Some(status)))

        try {
            val topicType = autoTopicCreationOverridePb.topicType match
                case pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_PARTITIONED     => "partitioned"
                case pb.AutoTopicCreationTopicType.AUTO_TOPIC_CREATION_TOPIC_TYPE_NON_PARTITIONED => "non-partitioned"
                case _                                                                            => "non-partitioned"

            val autoTopicCreation =
                if topicType == "partitioned" then
                    AutoTopicCreationOverride.builder
                        .allowAutoTopicCreation(autoTopicCreationOverridePb.isAllowTopicCreation)
                        .topicType(topicType)
                        .defaultNumPartitions(autoTopicCreationOverridePb.defaultNumPartitions)
                        .build
                    else
                    AutoTopicCreationOverride.builder
                        .allowAutoTopicCreation(autoTopicCreationOverridePb.isAllowTopicCreation)
                        .topicType(topicType)
                        .build

            adminClient.namespaces.setAutoTopicCreation(request.namespace, autoTopicCreation)
            Future.successful(SetAutoTopicCreationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetAutoTopicCreationResponse(status = Some(status)))
        }

    override def removeAutoTopicCreation(request: RemoveAutoTopicCreationRequest): Future[RemoveAutoTopicCreationResponse] =
        logger.info(s"Removing auto topic creation policy for namespace ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.removeAutoTopicCreation(request.namespace)
            Future.successful(RemoveAutoTopicCreationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveAutoTopicCreationResponse(status = Some(status)))
        }

    override def getBacklogQuotas(request: GetBacklogQuotasRequest): Future[GetBacklogQuotasResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def retentionPolicyToPb(policy: Option[RetentionPolicy]): Option[pb.BacklogQuotaRetentionPolicy] = policy match
            case Some(RetentionPolicy.consumer_backlog_eviction) =>
                Some(pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION)
            case Some(RetentionPolicy.producer_request_hold)     =>
                Some(pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_REQUEST_HOLD)
            case Some(RetentionPolicy.producer_exception)        =>
                Some(pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_EXCEPTION)
            case _ => None

        try {
            val backlogQuotaMap = adminClient.namespaces.getBacklogQuotaMap(request.namespace).asScala.toMap

            val destinationStorageBacklogQuotaPb = backlogQuotaMap.get(BacklogQuotaType.destination_storage) match
                case Some(quota) =>
                    Some(
                      pb.DestinationStorageBacklogQuota(
                        limitSize = Option(quota.getLimitSize).getOrElse(-1),
                        retentionPolicy = retentionPolicyToPb(Option(quota.getPolicy))
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
                messageAge = messageAgeBacklogQuotaPb
              )
            )
        } catch {
            case err =>
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

                    logger.info(s"Setting backlog quota policy (destination storage) on namespace ${request.namespace} to ${backlogQuota}")
                    adminClient.namespaces.setBacklogQuota(request.namespace, backlogQuota, BacklogQuotaType.destination_storage)
                case None =>

            request.messageAge match
                case Some(quotaPb) =>
                    var backlogQuotaBuilder = BacklogQuotaBuilder.limitTime(quotaPb.limitTime)

                    quotaPb.retentionPolicy match
                        case Some(retentionPolicy) =>
                            backlogQuotaBuilder = backlogQuotaBuilder.retentionPolicy(retentionPolicyFromPb(retentionPolicy))
                        case _ =>

                    val backlogQuota = backlogQuotaBuilder.build

                    logger.info(s"Setting backlog quota (message age) on namespace ${request.namespace} to ${backlogQuota}")
                    adminClient.namespaces.setBacklogQuota(request.namespace, backlogQuota, BacklogQuotaType.message_age)
                case None =>

            Future.successful(SetBacklogQuotasResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetBacklogQuotasResponse(status = Some(status)))
        }

    override def removeBacklogQuota(request: RemoveBacklogQuotaRequest): Future[RemoveBacklogQuotaResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try
            request.backlogQuotaType match
                case pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_DESTINATION_STORAGE =>
                    logger.info(s"Removing backlog quota (destination storage) on namespace ${request.namespace}")
                    adminClient.namespaces.removeBacklogQuota(request.namespace, BacklogQuotaType.destination_storage)
                case pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_MESSAGE_AGE =>
                    logger.info(s"Removing backlog quota (message age) on namespace ${request.namespace}")
                    adminClient.namespaces.removeBacklogQuota(request.namespace, BacklogQuotaType.message_age)
                case _ =>
                    val status = Status(code = Code.INVALID_ARGUMENT.index, message = "Backlog quota type should be specified")
                    return Future.successful(RemoveBacklogQuotaResponse(status = Some(status)))

            Future.successful(RemoveBacklogQuotaResponse(status = Some(Status(code = Code.OK.index))))
        catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveBacklogQuotaResponse(status = Some(status)))
        }

    override def getNamespaceAntiAffinityGroup(request: GetNamespaceAntiAffinityGroupRequest): Future[GetNamespaceAntiAffinityGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val namespaceAntiAffinityGroup = adminClient.namespaces.getNamespaceAntiAffinityGroup(request.namespace)

            Future.successful(
              GetNamespaceAntiAffinityGroupResponse(
                status = Some(Status(code = Code.OK.index)),
                namespaceAntiAffinityGroup = namespaceAntiAffinityGroup
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetNamespaceAntiAffinityGroupResponse(status = Some(status)))
        }

    override def setNamespaceAntiAffinityGroup(request: SetNamespaceAntiAffinityGroupRequest): Future[SetNamespaceAntiAffinityGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try
            adminClient.namespaces.setNamespaceAntiAffinityGroup(request.namespace, request.namespaceAntiAffinityGroup)
            Future.successful(SetNamespaceAntiAffinityGroupResponse(status = Some(Status(code = Code.OK.index))))
        catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetNamespaceAntiAffinityGroupResponse(status = Some(status)))
        }

    override def removeNamespaceAntiAffinityGroup(request: RemoveNamespaceAntiAffinityGroupRequest): Future[RemoveNamespaceAntiAffinityGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try
            adminClient.namespaces.deleteNamespaceAntiAffinityGroup(request.namespace)
            Future.successful(RemoveNamespaceAntiAffinityGroupResponse(status = Some(Status(code = Code.OK.index))))
        catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveNamespaceAntiAffinityGroupResponse(status = Some(status)))
        }

    override def getAntiAffinityNamespaces(request: GetAntiAffinityNamespacesRequest): Future[GetAntiAffinityNamespacesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try
            val namespaces = adminClient.namespaces
                .getAntiAffinityNamespaces(
                  request.tenant,
                  request.cluster,
                  request.namespaceAntiAffinityGroup
                )
                .asScala
                .toList
            Future.successful(
              GetAntiAffinityNamespacesResponse(
                status = Some(Status(code = Code.OK.index)),
                namespaces
              )
            )
        catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetAntiAffinityNamespacesResponse(status = Some(status)))
        }

    override def getBookieAffinityGroup(request: GetBookieAffinityGroupRequest): Future[GetBookieAffinityGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val groupData = Option(adminClient.namespaces.getBookieAffinityGroup(request.namespace)) match
                case Some(gd) => Some(pb.BookieAffinityGroupData(
                    primary = gd.getBookkeeperAffinityGroupPrimary.split(","),
                    secondary = gd.getBookkeeperAffinityGroupSecondary.split(",")
                ))
                case None => None
            Future.successful(
              GetBookieAffinityGroupResponse(
                status = Some(Status(code = Code.OK.index)),
                groupData = groupData
              )
            )
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetBookieAffinityGroupResponse(status = Some(status)))
        }

    override def setBookieAffinityGroup(request: SetBookieAffinityGroupRequest): Future[SetBookieAffinityGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val groupData: BookieAffinityGroupData = request.groupData match
                case Some(gd) => BookieAffinityGroupData.builder
                    .bookkeeperAffinityGroupPrimary(gd.primary.mkString(","))
                    .bookkeeperAffinityGroupSecondary(gd.secondary.mkString(","))
                    .build
                case None => BookieAffinityGroupData.builder.build

            logger.info(s"Setting bookie affinity group for namespace ${request.namespace}. ${groupData}")
            adminClient.namespaces.setBookieAffinityGroup(request.namespace, groupData)
            Future.successful(SetBookieAffinityGroupResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetBookieAffinityGroupResponse(status = Some(status)))
        }

    override def removeBookieAffinityGroup(request: RemoveBookieAffinityGroupRequest): Future[RemoveBookieAffinityGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing bookie affinity group policy for namespace ${request.namespace}")
            adminClient.namespaces.deleteBookieAffinityGroup(request.namespace)
            Future.successful(RemoveBookieAffinityGroupResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveBookieAffinityGroupResponse(status = Some(status)))
        }

    override def getCompactionThreshold(request: GetCompactionThresholdRequest): Future[GetCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val threshold = Option(adminClient.namespaces.getCompactionThreshold(request.namespace)).map(_.toLong) match
                case None => pb.GetCompactionThresholdResponse.Threshold.Disabled(new pb.CompactionThresholdDisabled())
                case Some(v) => pb.GetCompactionThresholdResponse.Threshold.Enabled(new CompactionThresholdEnabled(threshold = v))
            Future.successful(GetCompactionThresholdResponse(
                status = Some(Status(code = Code.OK.index)),
                threshold
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetCompactionThresholdResponse(status = Some(status)))
        }

    override def setCompactionThreshold(request: SetCompactionThresholdRequest): Future[SetCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting compaction threshold policy for namespace ${request.namespace}. ${request.threshold}")
            adminClient.namespaces.setCompactionThreshold(request.namespace, request.threshold)
            Future.successful(SetCompactionThresholdResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetCompactionThresholdResponse(status = Some(status)))
        }

    override def removeCompactionThreshold(request: RemoveCompactionThresholdRequest): Future[RemoveCompactionThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing compaction threshold policy for namespace ${request.namespace}")
            adminClient.namespaces.removeCompactionThreshold(request.namespace)
            Future.successful(RemoveCompactionThresholdResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveCompactionThresholdResponse(status = Some(status)))
        }

    override def getDeduplicationSnapshotInterval(request: GetDeduplicationSnapshotIntervalRequest): Future[GetDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val interval = Option(adminClient.namespaces.getDeduplicationSnapshotInterval(request.namespace)) match
                case None =>
                    pb.GetDeduplicationSnapshotIntervalResponse.Interval.Disabled(new pb.DeduplicationSnapshotIntervalDisabled())
                case Some(v) =>
                    pb.GetDeduplicationSnapshotIntervalResponse.Interval.Enabled(new DeduplicationSnapshotIntervalEnabled(interval = v))

            Future.successful(GetDeduplicationSnapshotIntervalResponse(
                status = Some(Status(code = Code.OK.index)),
                interval
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }

    override def setDeduplicationSnapshotInterval(request: SetDeduplicationSnapshotIntervalRequest): Future[SetDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting deduplication snapshot interval policy for namespace ${request.namespace}. ${request.interval}")
            adminClient.namespaces.setDeduplicationSnapshotInterval(request.namespace, request.interval)
            Future.successful(SetDeduplicationSnapshotIntervalResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }

    override def removeDeduplicationSnapshotInterval(request: RemoveDeduplicationSnapshotIntervalRequest): Future[RemoveDeduplicationSnapshotIntervalResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing deduplication snapshot interval policy for namespace ${request.namespace}")
            adminClient.namespaces.removeDeduplicationSnapshotInterval(request.namespace)
            Future.successful(RemoveDeduplicationSnapshotIntervalResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDeduplicationSnapshotIntervalResponse(status = Some(status)))
        }

    override def getDeduplication(request: GetDeduplicationRequest): Future[GetDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val deduplication = Option(adminClient.namespaces.getDeduplicationStatus(request.namespace)) match
                case None =>
                    pb.GetDeduplicationResponse.Deduplication.Unspecified(new DeduplicationUnspecified())
                case Some(v) =>
                    pb.GetDeduplicationResponse.Deduplication.Specified(new DeduplicationSpecified(enabled = v))

            Future.successful(GetDeduplicationResponse(
                status = Some(Status(code = Code.OK.index)),
                deduplication
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDeduplicationResponse(status = Some(status)))
        }

    override def setDeduplication(request: SetDeduplicationRequest): Future[SetDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting deduplication policy for namespace ${request.namespace}")
            adminClient.namespaces.setDeduplicationStatus(request.namespace, request.enabled)
            Future.successful(SetDeduplicationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDeduplicationResponse(status = Some(status)))
        }

    override def removeDeduplication(request: RemoveDeduplicationRequest): Future[RemoveDeduplicationResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing deduplication policy for namespace ${request.namespace}")
            adminClient.namespaces.removeDeduplicationStatus(request.namespace)
            Future.successful(RemoveDeduplicationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDeduplicationResponse(status = Some(status)))
        }

    override def getDelayedDelivery(request: GetDelayedDeliveryRequest): Future[GetDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val delayedDeliveryPb = Option(adminClient.namespaces.getDelayedDelivery(request.namespace)) match
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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting delayed delivery policy for namespace ${request.namespace}")
            val delayedDeliveryPolicies = DelayedDeliveryPolicies.builder
                .active(request.enabled)
                .tickTime(request.tickTimeMs)
                .build()

            adminClient.namespaces.setDelayedDeliveryMessages(request.namespace, delayedDeliveryPolicies)
            Future.successful(SetDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDelayedDeliveryResponse(status = Some(status)))
        }

    override def removeDelayedDelivery(request: RemoveDelayedDeliveryRequest): Future[RemoveDelayedDeliveryResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing delayed delivery policy for namespace ${request.namespace}")
            adminClient.namespaces.removeDelayedDeliveryMessages(request.namespace)
            Future.successful(RemoveDelayedDeliveryResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDelayedDeliveryResponse(status = Some(status)))
        }

    override def getDispatchRate(request: GetDispatchRateRequest): Future[GetDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val dispatchRatePb = Option(adminClient.namespaces.getDispatchRate(request.namespace)) match
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDispatchRateResponse(status = Some(status)))
        }

    override def setDispatchRate(request: SetDispatchRateRequest): Future[SetDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting dispatch rate policy for namespace ${request.namespace}")
            val dispatchRate = DispatchRate.builder
                .dispatchThrottlingRateInByte(request.rateInByte)
                .dispatchThrottlingRateInMsg(request.rateInMsg)
                .ratePeriodInSecond(request.periodInSecond)
                .relativeToPublishRate(request.isRelativeToPublishRate)
                .build

            adminClient.namespaces.setDispatchRate(request.namespace, dispatchRate)
            Future.successful(SetDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetDispatchRateResponse(status = Some(status)))
        }

    override def removeDispatchRate(request: RemoveDispatchRateRequest): Future[RemoveDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing dispatch rate policy for namespace ${request.namespace}")
            adminClient.namespaces.removeDispatchRate(request.namespace)
            Future.successful(RemoveDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDispatchRateResponse(status = Some(status)))
        }

    override def getEncryptionRequired(request: GetEncryptionRequiredRequest): Future[GetEncryptionRequiredResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val encryptionRequired = Option(adminClient.namespaces.getEncryptionRequiredStatus(request.namespace)) match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "Can't fetch encryption status from broker")
                    return Future.successful(GetEncryptionRequiredResponse(status = Some(status)))
                case Some(v) => v

            Future.successful(GetEncryptionRequiredResponse(
                status = Some(Status(code = Code.OK.index)),
                encryptionRequired
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetEncryptionRequiredResponse(status = Some(status)))
        }

    override def setEncryptionRequired(request: SetEncryptionRequiredRequest): Future[SetEncryptionRequiredResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting encryption required policy for namespace ${request.namespace}")
            adminClient.namespaces.setEncryptionRequiredStatus(request.namespace, request.encryptionRequired)
            Future.successful(SetEncryptionRequiredResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetEncryptionRequiredResponse(status = Some(status)))
        }


    override def getInactiveTopicPolicies(request: GetInactiveTopicPoliciesRequest): Future[GetInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val inactiveTopicPoliciesPb = Option(adminClient.namespaces.getInactiveTopicPolicies(request.namespace)) match
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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting inactive topic policies policy for namespace ${request.namespace}")

            val inactiveTopicPolicies = new InactiveTopicPolicies()
            inactiveTopicPolicies.setDeleteWhileInactive(request.deleteWhileInactive)
            inactiveTopicPolicies.setMaxInactiveDurationSeconds(request.maxInactiveDurationSeconds)

            request.inactiveTopicDeleteMode match
                case InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS =>
                    inactiveTopicPolicies.setInactiveTopicDeleteMode(InactiveTopicDeleteMode.delete_when_no_subscriptions)
                case InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP =>
                    inactiveTopicPolicies.setInactiveTopicDeleteMode(InactiveTopicDeleteMode.delete_when_subscriptions_caught_up)

            adminClient.namespaces.setInactiveTopicPolicies(request.namespace, inactiveTopicPolicies)
            Future.successful(SetInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetInactiveTopicPoliciesResponse(status = Some(status)))
        }

    override def removeInactiveTopicPolicies(request: RemoveInactiveTopicPoliciesRequest): Future[RemoveInactiveTopicPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing inactive topic policies policy for namespace ${request.namespace}")
            adminClient.namespaces.removeInactiveTopicPolicies(request.namespace)
            Future.successful(RemoveInactiveTopicPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveInactiveTopicPoliciesResponse(status = Some(status)))
        }

    override def getMaxConsumersPerSubscription(request: GetMaxConsumersPerSubscriptionRequest): Future[GetMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxConsumersPerSubscriptionPb = Option(adminClient.namespaces.getMaxConsumersPerSubscription(request.namespace)) match
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }

    override def setMaxConsumersPerSubscription(request: SetMaxConsumersPerSubscriptionRequest): Future[SetMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max consumers per subscription policy for namespace ${request.namespace}")
            adminClient.namespaces.setMaxConsumersPerSubscription(request.namespace, request.maxConsumersPerSubscription)
            Future.successful(SetMaxConsumersPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }

    override def removeMaxConsumersPerSubscription(request: RemoveMaxConsumersPerSubscriptionRequest): Future[RemoveMaxConsumersPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max consumers per subscription policy for namespace ${request.namespace}")
            adminClient.namespaces.removeMaxConsumersPerSubscription(request.namespace)
            Future.successful(RemoveMaxConsumersPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxConsumersPerSubscriptionResponse(status = Some(status)))
        }

    override def getMaxConsumersPerTopic(request: GetMaxConsumersPerTopicRequest): Future[GetMaxConsumersPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxConsumersPerTopicPb = Option(adminClient.namespaces.getMaxConsumersPerTopic(request.namespace)) match
                case None =>
                    pb.GetMaxConsumersPerTopicResponse.MaxConsumersPerTopic.Unspecified(new MaxConsumersPerTopicUnspecified())
                case Some(v) =>
                    pb.GetMaxConsumersPerTopicResponse.MaxConsumersPerTopic.Specified(new MaxConsumersPerTopicSpecified(
                        maxConsumersPerTopic = v
                    ))

            Future.successful(GetMaxConsumersPerTopicResponse(
                status = Some(Status(code = Code.OK.index)),
                maxConsumersPerTopic = maxConsumersPerTopicPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxConsumersPerTopicResponse(status = Some(status)))
        }

    override def setMaxConsumersPerTopic(request: SetMaxConsumersPerTopicRequest): Future[SetMaxConsumersPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max consumers per topic policy for namespace ${request.namespace}")
            adminClient.namespaces.setMaxConsumersPerTopic(request.namespace, request.maxConsumersPerTopic)
            Future.successful(SetMaxConsumersPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxConsumersPerTopicResponse(status = Some(status)))
        }

    override def removeMaxConsumersPerTopic(request: RemoveMaxConsumersPerTopicRequest): Future[RemoveMaxConsumersPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max consumers per topic policy for namespace ${request.namespace}")
            adminClient.namespaces.removeMaxConsumersPerTopic(request.namespace)
            Future.successful(RemoveMaxConsumersPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxConsumersPerTopicResponse(status = Some(status)))
        }

    override def getMaxProducersPerTopic(request: GetMaxProducersPerTopicRequest): Future[GetMaxProducersPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxProducersPerTopicPb = Option(adminClient.namespaces.getMaxProducersPerTopic(request.namespace)) match
                case None =>
                    pb.GetMaxProducersPerTopicResponse.MaxProducersPerTopic.Unspecified(new MaxProducersPerTopicUnspecified())
                case Some(v) =>
                    pb.GetMaxProducersPerTopicResponse.MaxProducersPerTopic.Specified(new MaxProducersPerTopicSpecified(
                        maxProducersPerTopic = v
                    ))

            Future.successful(GetMaxProducersPerTopicResponse(
                status = Some(Status(code = Code.OK.index)),
                maxProducersPerTopic = maxProducersPerTopicPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxProducersPerTopicResponse(status = Some(status)))
        }

    override def setMaxProducersPerTopic(request: SetMaxProducersPerTopicRequest): Future[SetMaxProducersPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max producers per topic policy for namespace ${request.namespace}")
            adminClient.namespaces.setMaxProducersPerTopic(request.namespace, request.maxProducersPerTopic)
            Future.successful(SetMaxProducersPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxProducersPerTopicResponse(status = Some(status)))
        }

    override def removeMaxProducersPerTopic(request: RemoveMaxProducersPerTopicRequest): Future[RemoveMaxProducersPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max producers per topic policy for namespace ${request.namespace}")
            adminClient.namespaces.removeMaxProducersPerTopic(request.namespace)
            Future.successful(RemoveMaxProducersPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxProducersPerTopicResponse(status = Some(status)))
        }

    override def getMaxSubscriptionsPerTopic(request: GetMaxSubscriptionsPerTopicRequest): Future[GetMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxSubscriptionsPerTopicPb = Option(adminClient.namespaces.getMaxSubscriptionsPerTopic(request.namespace)) match
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }

    override def setMaxSubscriptionsPerTopic(request: SetMaxSubscriptionsPerTopicRequest): Future[SetMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max subscriptions per topic policy for namespace ${request.namespace}")
            adminClient.namespaces.setMaxSubscriptionsPerTopic(request.namespace, request.maxSubscriptionsPerTopic)
            Future.successful(SetMaxSubscriptionsPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }

    override def removeMaxSubscriptionsPerTopic(request: RemoveMaxSubscriptionsPerTopicRequest): Future[RemoveMaxSubscriptionsPerTopicResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max subscriptions per topic policy for namespace ${request.namespace}")
            adminClient.namespaces.removeMaxSubscriptionsPerTopic(request.namespace)
            Future.successful(RemoveMaxSubscriptionsPerTopicResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxSubscriptionsPerTopicResponse(status = Some(status)))
        }

    override def getMaxTopicsPerNamespace(request: GetMaxTopicsPerNamespaceRequest): Future[GetMaxTopicsPerNamespaceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxTopicsPerNamespacePb = Option(adminClient.namespaces.getMaxTopicsPerNamespace(request.namespace)) match
                case None =>
                    pb.GetMaxTopicsPerNamespaceResponse.MaxTopicsPerNamespace.Unspecified(new MaxTopicsPerNamespaceUnspecified())
                case Some(v) =>
                    pb.GetMaxTopicsPerNamespaceResponse.MaxTopicsPerNamespace.Specified(new MaxTopicsPerNamespaceSpecified(
                        maxTopicsPerNamespace = v
                    ))

            Future.successful(GetMaxTopicsPerNamespaceResponse(
                status = Some(Status(code = Code.OK.index)),
                maxTopicsPerNamespace = maxTopicsPerNamespacePb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxTopicsPerNamespaceResponse(status = Some(status)))
        }

    override def setMaxTopicsPerNamespace(request: SetMaxTopicsPerNamespaceRequest): Future[SetMaxTopicsPerNamespaceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max topics per namespace policy for namespace ${request.namespace}")
            adminClient.namespaces.setMaxTopicsPerNamespace(request.namespace, request.maxTopicsPerNamespace)
            Future.successful(SetMaxTopicsPerNamespaceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxTopicsPerNamespaceResponse(status = Some(status)))
        }

    override def removeMaxTopicsPerNamespace(request: RemoveMaxTopicsPerNamespaceRequest): Future[RemoveMaxTopicsPerNamespaceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max topics per namespace policy for namespace ${request.namespace}")
            adminClient.namespaces.removeMaxTopicsPerNamespace(request.namespace)
            Future.successful(RemoveMaxTopicsPerNamespaceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxTopicsPerNamespaceResponse(status = Some(status)))
        }

    override def getMaxUnackedMessagesPerConsumer(request: GetMaxUnackedMessagesPerConsumerRequest): Future[GetMaxUnackedMessagesPerConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxUnackedMessagesPerConsumerPb = Option(adminClient.namespaces.getMaxUnackedMessagesPerConsumer(request.namespace)) match
                case None =>
                    pb.GetMaxUnackedMessagesPerConsumerResponse.MaxUnackedMessagesPerConsumer.Unspecified(new MaxUnackedMessagesPerConsumerUnspecified())
                case Some(v) =>
                    pb.GetMaxUnackedMessagesPerConsumerResponse.MaxUnackedMessagesPerConsumer.Specified(new MaxUnackedMessagesPerConsumerSpecified(
                        maxUnackedMessagesPerConsumer = v
                    ))

            Future.successful(GetMaxUnackedMessagesPerConsumerResponse(
                status = Some(Status(code = Code.OK.index)),
                maxUnackedMessagesPerConsumer = maxUnackedMessagesPerConsumerPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxUnackedMessagesPerConsumerResponse(status = Some(status)))
        }

    override def setMaxUnackedMessagesPerConsumer(request: SetMaxUnackedMessagesPerConsumerRequest): Future[SetMaxUnackedMessagesPerConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max unacked messages per consumer policy for namespace ${request.namespace}")
            adminClient.namespaces.setMaxUnackedMessagesPerConsumer(request.namespace, request.maxUnackedMessagesPerConsumer)
            Future.successful(SetMaxUnackedMessagesPerConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxUnackedMessagesPerConsumerResponse(status = Some(status)))
        }

    override def removeMaxUnackedMessagesPerConsumer(request: RemoveMaxUnackedMessagesPerConsumerRequest): Future[RemoveMaxUnackedMessagesPerConsumerResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max unacked messages per consumer policy for namespace ${request.namespace}")
            adminClient.namespaces.removeMaxUnackedMessagesPerConsumer(request.namespace)
            Future.successful(RemoveMaxUnackedMessagesPerConsumerResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxUnackedMessagesPerConsumerResponse(status = Some(status)))
        }

    override def getMaxUnackedMessagesPerSubscription(request: GetMaxUnackedMessagesPerSubscriptionRequest): Future[GetMaxUnackedMessagesPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val maxUnackedMessagesPerSubscriptionPb = Option(adminClient.namespaces.getMaxUnackedMessagesPerSubscription(request.namespace)) match
                case None =>
                    pb.GetMaxUnackedMessagesPerSubscriptionResponse.MaxUnackedMessagesPerSubscription.Unspecified(new MaxUnackedMessagesPerSubscriptionUnspecified())
                case Some(v) =>
                    pb.GetMaxUnackedMessagesPerSubscriptionResponse.MaxUnackedMessagesPerSubscription.Specified(new MaxUnackedMessagesPerSubscriptionSpecified(
                        maxUnackedMessagesPerSubscription = v
                    ))

            Future.successful(GetMaxUnackedMessagesPerSubscriptionResponse(
                status = Some(Status(code = Code.OK.index)),
                maxUnackedMessagesPerSubscription = maxUnackedMessagesPerSubscriptionPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetMaxUnackedMessagesPerSubscriptionResponse(status = Some(status)))
        }

    override def setMaxUnackedMessagesPerSubscription(request: SetMaxUnackedMessagesPerSubscriptionRequest): Future[SetMaxUnackedMessagesPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting max unacked messages per subscription policy for namespace ${request.namespace}")
            adminClient.namespaces.setMaxUnackedMessagesPerSubscription(request.namespace, request.maxUnackedMessagesPerSubscription)
            Future.successful(SetMaxUnackedMessagesPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMaxUnackedMessagesPerSubscriptionResponse(status = Some(status)))
        }

    override def removeMaxUnackedMessagesPerSubscription(request: RemoveMaxUnackedMessagesPerSubscriptionRequest): Future[RemoveMaxUnackedMessagesPerSubscriptionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing max unacked messages per subscription policy for namespace ${request.namespace}")
            adminClient.namespaces.removeMaxUnackedMessagesPerSubscription(request.namespace)
            Future.successful(RemoveMaxUnackedMessagesPerSubscriptionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMaxUnackedMessagesPerSubscriptionResponse(status = Some(status)))
        }

    override def getMessageTtl(request: GetMessageTtlRequest): Future[GetMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val messageTtlPb = Option(adminClient.namespaces.getNamespaceMessageTTL(request.namespace)) match
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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting message TTL policy for namespace ${request.namespace}")
            adminClient.namespaces.setNamespaceMessageTTL(request.namespace, request.messageTtlSeconds)
            Future.successful(SetMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetMessageTtlResponse(status = Some(status)))
        }

    override def removeMessageTtl(request: RemoveMessageTtlRequest): Future[RemoveMessageTtlResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing message TTL policy for namespace ${request.namespace}")
            adminClient.namespaces.removeNamespaceMessageTTL(request.namespace)
            Future.successful(RemoveMessageTtlResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveMessageTtlResponse(status = Some(status)))
        }

    override def getOffloadDeletionLag(request: GetOffloadDeletionLagRequest): Future[GetOffloadDeletionLagResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val offloadDeletionLagPb = Option(adminClient.namespaces.getOffloadDeleteLagMs(request.namespace)) match
                case None =>
                    pb.GetOffloadDeletionLagResponse.OffloadDeletionLag.Unspecified(new OffloadDeletionLagUnspecified())
                case Some(v) =>
                    pb.GetOffloadDeletionLagResponse.OffloadDeletionLag.Specified(new OffloadDeletionLagSpecified(
                        offloadDeletionLagMs = v
                    ))

            Future.successful(GetOffloadDeletionLagResponse(
                status = Some(Status(code = Code.OK.index)),
                offloadDeletionLag = offloadDeletionLagPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetOffloadDeletionLagResponse(status = Some(status)))
        }

    override def setOffloadDeletionLag(request: SetOffloadDeletionLagRequest): Future[SetOffloadDeletionLagResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting offload deletion lag policy for namespace ${request.namespace}")
            adminClient.namespaces.setOffloadDeleteLag(request.namespace, request.offloadDeletionLagMs, TimeUnit.MILLISECONDS)
            Future.successful(SetOffloadDeletionLagResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetOffloadDeletionLagResponse(status = Some(status)))
        }

    override def removeOffloadDeletionLag(request: RemoveOffloadDeletionLagRequest): Future[RemoveOffloadDeletionLagResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing offload deletion lag policy for namespace ${request.namespace}")
            adminClient.namespaces.clearOffloadDeleteLag(request.namespace)
            Future.successful(RemoveOffloadDeletionLagResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveOffloadDeletionLagResponse(status = Some(status)))
        }

    override def getOffloadThreshold(request: GetOffloadThresholdRequest): Future[GetOffloadThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val offloadThresholdPb = Option(adminClient.namespaces.getOffloadThreshold(request.namespace)) match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index)
                    return Future.successful(GetOffloadThresholdResponse(status = Some(status)))
                case Some(v) =>
                    pb.GetOffloadThresholdResponse.OffloadThreshold.Specified(new OffloadThresholdSpecified(
                        offloadThresholdBytes = v
                    ))

            Future.successful(GetOffloadThresholdResponse(
                status = Some(Status(code = Code.OK.index)),
                offloadThreshold = offloadThresholdPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetOffloadThresholdResponse(status = Some(status)))
        }

    override def setOffloadThreshold(request: SetOffloadThresholdRequest): Future[SetOffloadThresholdResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting offload threshold policy for namespace ${request.namespace}")
            adminClient.namespaces.setOffloadThreshold(request.namespace, request.offloadThresholdBytes)
            Future.successful(SetOffloadThresholdResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetOffloadThresholdResponse(status = Some(status)))
        }

    override def getPersistence(request: GetPersistenceRequest): Future[GetPersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val persistencePb = Option(adminClient.namespaces.getPersistence(request.namespace)) match
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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting persistence policy for namespace ${request.namespace}")
            val persistencePolicies = PersistencePolicies(request.bookkeeperEnsemble, request.bookkeeperWriteQuorum, request.bookkeeperAckQuorum, request.managedLedgerMaxMarkDeleteRate)
            adminClient.namespaces.setPersistence(request.namespace, persistencePolicies)
            Future.successful(SetPersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetPersistenceResponse(status = Some(status)))
        }

    override def removePersistence(request: RemovePersistenceRequest): Future[RemovePersistenceResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing persistence policy for namespace ${request.namespace}")
            adminClient.namespaces.removePersistence(request.namespace)
            Future.successful(RemovePersistenceResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemovePersistenceResponse(status = Some(status)))
        }

    override def getReplicationClusters(request: GetReplicationClustersRequest): Future[GetReplicationClustersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val replicationClusters = Option(adminClient.namespaces.getNamespaceReplicationClusters(request.namespace))
                .map(_.asScala.toSeq)
                .getOrElse(Seq.empty[String])

            Future.successful(GetReplicationClustersResponse(
                status = Some(Status(code = Code.OK.index)),
                replicationClusters
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetReplicationClustersResponse(status = Some(status)))
        }

    override def setReplicationClusters(request: SetReplicationClustersRequest): Future[SetReplicationClustersResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting replication clusters for namespace ${request.namespace}")
            adminClient.namespaces.setNamespaceReplicationClusters(request.namespace, request.replicationClusters.toSet.asJava)
            Future.successful(SetReplicationClustersResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetReplicationClustersResponse(status = Some(status)))
        }

    override def getReplicatorDispatchRate(request: GetReplicatorDispatchRateRequest): Future[GetReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val replicatorDispatchRatePb = Option(adminClient.namespaces.getReplicatorDispatchRate(request.namespace)) match
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetReplicatorDispatchRateResponse(status = Some(status)))
        }

    override def setReplicatorDispatchRate(request: SetReplicatorDispatchRateRequest): Future[SetReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting replicator dispatch rate for namespace ${request.namespace}")
            val dispatchRate = DispatchRate.builder
                .dispatchThrottlingRateInByte(request.rateInByte)
                .dispatchThrottlingRateInMsg(request.rateInMsg)
                .ratePeriodInSecond(request.periodInSecond)
                .relativeToPublishRate(request.isRelativeToPublishRate)
                .build

            adminClient.namespaces.setReplicatorDispatchRate(request.namespace, dispatchRate)
            Future.successful(SetReplicatorDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetReplicatorDispatchRateResponse(status = Some(status)))
        }

    override def removeReplicatorDispatchRate(request: RemoveReplicatorDispatchRateRequest): Future[RemoveReplicatorDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing replicator dispatch rate for namespace ${request.namespace}")
            adminClient.namespaces.removeReplicatorDispatchRate(request.namespace)
            Future.successful(RemoveReplicatorDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveReplicatorDispatchRateResponse(status = Some(status)))
        }

    override def getSubscriptionDispatchRate(request: GetSubscriptionDispatchRateRequest): Future[GetSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscriptionDispatchRatePb = Option(adminClient.namespaces.getSubscriptionDispatchRate(request.namespace)) match
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscriptionDispatchRateResponse(status = Some(status)))
        }

    override def setSubscriptionDispatchRate(request: SetSubscriptionDispatchRateRequest): Future[SetSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting subscription dispatch rate for namespace ${request.namespace}")
            val dispatchRate = DispatchRate.builder
                .dispatchThrottlingRateInByte(request.rateInByte)
                .dispatchThrottlingRateInMsg(request.rateInMsg)
                .ratePeriodInSecond(request.periodInSecond)
                .relativeToPublishRate(request.isRelativeToPublishRate)
                .build

            adminClient.namespaces.setSubscriptionDispatchRate(request.namespace, dispatchRate)
            Future.successful(SetSubscriptionDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscriptionDispatchRateResponse(status = Some(status)))
        }

    override def removeSubscriptionDispatchRate(request: RemoveSubscriptionDispatchRateRequest): Future[RemoveSubscriptionDispatchRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscription dispatch rate for namespace ${request.namespace}")
            adminClient.namespaces.removeSubscriptionDispatchRate(request.namespace)
            Future.successful(RemoveSubscriptionDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSubscriptionDispatchRateResponse(status = Some(status)))
        }

    override def getRetention(request: GetRetentionRequest): Future[GetRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val retentionPb = Option(adminClient.namespaces.getRetention(request.namespace)) match
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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting retention for namespace ${request.namespace}")
            val retention = new RetentionPolicies(request.retentionTimeInMinutes, request.retentionSizeInMb)

            adminClient.namespaces.setRetention(request.namespace, retention)
            Future.successful(SetRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetRetentionResponse(status = Some(status)))
        }

    override def removeRetention(request: RemoveRetentionRequest): Future[RemoveRetentionResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing retention for namespace ${request.namespace}")
            adminClient.namespaces.removeRetention(request.namespace)
            Future.successful(RemoveRetentionResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveRetentionResponse(status = Some(status)))
        }

    override def getSubscribeRate(request: GetSubscribeRateRequest): Future[GetSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscribeRatePb = Option(adminClient.namespaces.getSubscribeRate(request.namespace)) match
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscribeRateResponse(status = Some(status)))
        }

    override def setSubscribeRate(request: SetSubscribeRateRequest): Future[SetSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting subscribe rate policy for namespace ${request.namespace}")
            val subscribeRate = new SubscribeRate(request.subscribeThrottlingRatePerConsumer, request.ratePeriodInSeconds)

            adminClient.namespaces.setSubscribeRate(request.namespace, subscribeRate)
            Future.successful(SetSubscribeRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscribeRateResponse(status = Some(status)))
        }

    override def removeSubscribeRate(request: RemoveSubscribeRateRequest): Future[RemoveSubscribeRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscribe rate policy for namespace ${request.namespace}")
            adminClient.namespaces.removeSubscribeRate(request.namespace)
            Future.successful(RemoveSubscribeRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSubscribeRateResponse(status = Some(status)))
        }

    override def getSubscriptionAuthMode(request: GetSubscriptionAuthModeRequest): Future[GetSubscriptionAuthModeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscriptionAuthModePb = adminClient.namespaces.getSubscriptionAuthMode(request.namespace) match
                case SubscriptionAuthMode.None => pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_NONE
                case SubscriptionAuthMode.Prefix => pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_PREFIX

            Future.successful(GetSubscriptionAuthModeResponse(
                status = Some(Status(code = Code.OK.index)),
                subscriptionAuthMode = subscriptionAuthModePb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscriptionAuthModeResponse(status = Some(status)))
        }

    override def setSubscriptionAuthMode(request: SetSubscriptionAuthModeRequest): Future[SetSubscriptionAuthModeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting subscription auth mode policy for namespace ${request.namespace}")
            val subscriptionAuthMode = request.subscriptionAuthMode match
                case pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_NONE => SubscriptionAuthMode.None
                case pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_PREFIX => SubscriptionAuthMode.Prefix
                case _ =>
                    return Future.successful(SetSubscriptionAuthModeResponse(status = Some(Status(code = Code.INVALID_ARGUMENT.index, message = "Invalid subscription auth mode"))))

            adminClient.namespaces.setSubscriptionAuthMode(request.namespace, subscriptionAuthMode)
            Future.successful(SetSubscriptionAuthModeResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscriptionAuthModeResponse(status = Some(status)))
        }

    override def getSubscriptionExpirationTime(request: GetSubscriptionExpirationTimeRequest): Future[GetSubscriptionExpirationTimeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val subscriptionExpirationTimePb = Option(adminClient.namespaces.getSubscriptionExpirationTime(request.namespace)) match
                case None =>
                    pb.GetSubscriptionExpirationTimeResponse.SubscriptionExpirationTime.Unspecified(new SubscriptionExpirationTimeUnspecified())
                case Some(v) =>
                    pb.GetSubscriptionExpirationTimeResponse.SubscriptionExpirationTime.Specified(new SubscriptionExpirationTimeSpecified(
                        subscriptionExpirationTimeInMinutes = v
                    ))

            Future.successful(GetSubscriptionExpirationTimeResponse(
                status = Some(Status(code = Code.OK.index)),
                subscriptionExpirationTime = subscriptionExpirationTimePb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetSubscriptionExpirationTimeResponse(status = Some(status)))
        }

    override def setSubscriptionExpirationTime(request: SetSubscriptionExpirationTimeRequest): Future[SetSubscriptionExpirationTimeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting subscription expiration time policy for namespace ${request.namespace}")
            adminClient.namespaces.setSubscriptionExpirationTime(request.namespace, request.subscriptionExpirationTimeInMinutes)
            Future.successful(SetSubscriptionExpirationTimeResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscriptionExpirationTimeResponse(status = Some(status)))
        }

    override def removeSubscriptionExpirationTime(request: RemoveSubscriptionExpirationTimeRequest): Future[RemoveSubscriptionExpirationTimeResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscription expiration time policy for namespace ${request.namespace}")
            adminClient.namespaces.removeSubscriptionExpirationTime(request.namespace)
            Future.successful(RemoveSubscriptionExpirationTimeResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSubscriptionExpirationTimeResponse(status = Some(status)))
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
            val subscriptionTypesEnabledPb = Option(adminClient.namespaces.getSubscriptionTypesEnabled(request.namespace)) match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "Subscription types enabled can't be null. Looks like a Pulsar error.")
                    return Future.successful(GetSubscriptionTypesEnabledResponse(status = Some(status)))
                case Some(v) if v.size() == 0 =>
                    pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabled.Inherited(new SubscriptionTypesEnabledInherited())
                case Some(v) =>
                    pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabled.Specified(new SubscriptionTypesEnabledSpecified(
                      types = v.asScala.map(subscriptionTypeToPb).toSeq
                    ))

            Future.successful(GetSubscriptionTypesEnabledResponse(
                status = Some(Status(code = Code.OK.index)),
                subscriptionTypesEnabled = subscriptionTypesEnabledPb
            ))
        } catch {
            err =>
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

        try {
            logger.info(s"Setting subscription types enabled policy for namespace ${request.namespace}")

            val subscriptionTypesEnabled = request.types.map(pbToSubscriptionType).toSet.asJava
            adminClient.namespaces.setSubscriptionTypesEnabled(request.namespace, subscriptionTypesEnabled)
            Future.successful(SetSubscriptionTypesEnabledResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetSubscriptionTypesEnabledResponse(status = Some(status)))
        }

    override def removeSubscriptionTypesEnabled(request: RemoveSubscriptionTypesEnabledRequest): Future[RemoveSubscriptionTypesEnabledResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing subscription types enabled policy for namespace ${request.namespace}")
            adminClient.namespaces.removeSubscriptionTypesEnabled(request.namespace)
            Future.successful(RemoveSubscriptionTypesEnabledResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveSubscriptionTypesEnabledResponse(status = Some(status)))
        }

    override def getOffloadPolicies(request: GetOffloadPoliciesRequest): Future[GetOffloadPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def offloadedReadPriorityToPb(offloadedReadPriority: OffloadedReadPriority): pb.OffloadedReadPriority =
            offloadedReadPriority match
                case OffloadedReadPriority.BOOKKEEPER_FIRST => pb.OffloadedReadPriority.OFFLOADED_READ_PRIORITY_BOOKKEEPER_FIRST
                case OffloadedReadPriority.TIERED_STORAGE_FIRST => pb.OffloadedReadPriority.OFFLOADED_READ_PRIORITY_TIERED_STORAGE_FIRST

        def offloadPoliciesToPb(p: OffloadPolicies): pb.OffloadPoliciesSpecified =
            pb.OffloadPoliciesSpecified(
                managedLedgerOffloadDriver = p.getManagedLedgerOffloadDriver,
                managedLedgerOffloadThresholdInBytes = p.getManagedLedgerOffloadThresholdInBytes,
                offloadersDirectory = Option(p.getOffloadersDirectory),
                managedLedgerMaxThreads = Option(p.getManagedLedgerOffloadMaxThreads),
                managedLedgerOffloadPrefetchRounds = Option(p.getManagedLedgerOffloadPrefetchRounds),
                managedLedgerOffloadDeletionLagInMillis = Option(p.getManagedLedgerOffloadDeletionLagInMillis),
                offloadedReadPriority = Option(offloadedReadPriorityToPb(p.getManagedLedgerOffloadedReadPriority)),
                s3ManagedLedgerOffloadRegion = Option(p.getS3ManagedLedgerOffloadRegion),
                s3ManagedLedgerOffloadBucket = Option(p.getS3ManagedLedgerOffloadBucket),
                s3ManagedLedgerOffloadServiceEndpoint = Option(p.getS3ManagedLedgerOffloadServiceEndpoint),
                s3ManagedLedgerOffloadMaxBlockSizeInBytes = Option(p.getS3ManagedLedgerOffloadMaxBlockSizeInBytes),
                s3ManagedLedgerOffloadReadBufferSizeInBytes = Option(p.getS3ManagedLedgerOffloadReadBufferSizeInBytes),
                s3ManagedLedgerOffloadCredentialId = Option(p.getS3ManagedLedgerOffloadCredentialId),
                s3ManagedLedgerOffloadCredentialSecret = Option(p.getS3ManagedLedgerOffloadCredentialSecret),
                s3ManagedLedgerOffloadRole = Option(p.getS3ManagedLedgerOffloadRole),
                s3ManagedLedgerOffloadRoleSessionName = Option(p.getS3ManagedLedgerOffloadRoleSessionName),
                gcsManagedLedgerOffloadRegion = Option(p.getGcsManagedLedgerOffloadRegion),
                gcsManagedLedgerOffloadBucket = Option(p.getGcsManagedLedgerOffloadBucket),
                gcsManagedLedgerOffloadMaxBlockSizeInBytes = Option(p.getGcsManagedLedgerOffloadMaxBlockSizeInBytes),
                gcsManagedLedgerOffloadReadBufferSizeInBytes = Option(p.getGcsManagedLedgerOffloadReadBufferSizeInBytes),
                gcsManagedLedgerOffloadServiceAccountKeyFile = Option(p.getGcsManagedLedgerOffloadServiceAccountKeyFile),
                fileSystemProfilePath = Option(p.getFileSystemProfilePath),
                fileSystemUri = Option(p.getFileSystemURI),
                managedLedgerOffloadBucket = Option(p.getManagedLedgerOffloadBucket),
                managedLedgerOffloadRegion = Option(p.getManagedLedgerOffloadRegion),
                managedLedgerOffloadServiceEndpoint = Option(p.getManagedLedgerOffloadServiceEndpoint),
                managedLedgerOffloadMaxBlockSizeInBytes = Option(p.getManagedLedgerOffloadMaxBlockSizeInBytes),
                managedLedgerOffloadReadBufferSizeInBytes = Option(p.getManagedLedgerOffloadReadBufferSizeInBytes),
            )

        try {
            val offloadPoliciesPb = Option(adminClient.namespaces.getOffloadPolicies(request.namespace)) match
                case None =>
                    pb.GetOffloadPoliciesResponse.OffloadPolicies.Inherited(new pb.OffloadPoliciesInherited())
                case Some(v) =>
                    pb.GetOffloadPoliciesResponse.OffloadPolicies.Specified(offloadPoliciesToPb(v))

            Future.successful(GetOffloadPoliciesResponse(
                status = Some(Status(code = Code.OK.index)),
                offloadPolicies = offloadPoliciesPb
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetOffloadPoliciesResponse(status = Some(status)))
        }

    override def setOffloadPolicies(request: SetOffloadPoliciesRequest): Future[SetOffloadPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        def offloadedReadPriorityFromPb(offloadedReadPriority: pb.OffloadedReadPriority): OffloadedReadPriority =
            offloadedReadPriority match
                case pb.OffloadedReadPriority.OFFLOADED_READ_PRIORITY_BOOKKEEPER_FIRST => OffloadedReadPriority.BOOKKEEPER_FIRST
                case pb.OffloadedReadPriority.OFFLOADED_READ_PRIORITY_TIERED_STORAGE_FIRST => OffloadedReadPriority.TIERED_STORAGE_FIRST
                case _ => throw new IllegalArgumentException("Unknown OffloadedReadPriority: " + offloadedReadPriority)

        def offloadPoliciesFromPb(p: pb.OffloadPoliciesSpecified): OffloadPolicies =
            val policies = OffloadPolicies.builder()

            policies.managedLedgerOffloadDriver(p.managedLedgerOffloadDriver)
            policies.managedLedgerOffloadThresholdInBytes(p.managedLedgerOffloadThresholdInBytes)
            p.offloadersDirectory.foreach(v => policies.offloadersDirectory(v))
            p.managedLedgerMaxThreads.foreach(v => policies.managedLedgerOffloadMaxThreads(v))
            p.managedLedgerOffloadPrefetchRounds.foreach(v => policies.managedLedgerOffloadPrefetchRounds(v))
            p.managedLedgerOffloadDeletionLagInMillis.foreach(v => policies.managedLedgerOffloadDeletionLagInMillis(v))
            p.offloadedReadPriority.foreach(v => policies.managedLedgerOffloadedReadPriority(offloadedReadPriorityFromPb(v)))
            p.s3ManagedLedgerOffloadRegion.foreach(v => policies.s3ManagedLedgerOffloadRegion(v))
            p.s3ManagedLedgerOffloadBucket.foreach(v => policies.s3ManagedLedgerOffloadBucket(v))
            p.s3ManagedLedgerOffloadServiceEndpoint.foreach(v => policies.s3ManagedLedgerOffloadServiceEndpoint(v))
            p.s3ManagedLedgerOffloadMaxBlockSizeInBytes.foreach(v => policies.s3ManagedLedgerOffloadMaxBlockSizeInBytes(v))
            p.s3ManagedLedgerOffloadReadBufferSizeInBytes.foreach(v => policies.s3ManagedLedgerOffloadReadBufferSizeInBytes(v))
            p.s3ManagedLedgerOffloadCredentialId.foreach(v => policies.s3ManagedLedgerOffloadCredentialId(v))
            p.s3ManagedLedgerOffloadCredentialSecret.foreach(v => policies.s3ManagedLedgerOffloadCredentialSecret(v))
            p.s3ManagedLedgerOffloadRole.foreach(v => policies.s3ManagedLedgerOffloadRole(v))
            p.s3ManagedLedgerOffloadRoleSessionName.foreach(v => policies.setS3ManagedLedgerOffloadRoleSessionName(v))
            p.gcsManagedLedgerOffloadRegion.foreach(v => policies.gcsManagedLedgerOffloadRegion(v))
            p.gcsManagedLedgerOffloadBucket.foreach(v => policies.gcsManagedLedgerOffloadBucket(v))
            p.gcsManagedLedgerOffloadMaxBlockSizeInBytes.foreach(v => policies.gcsManagedLedgerOffloadMaxBlockSizeInBytes(v))
            p.gcsManagedLedgerOffloadReadBufferSizeInBytes.foreach(v => policies.gcsManagedLedgerOffloadReadBufferSizeInBytes(v))
            p.gcsManagedLedgerOffloadServiceAccountKeyFile.foreach(v => policies.gcsManagedLedgerOffloadServiceAccountKeyFile(v))
            p.fileSystemProfilePath.foreach(v => policies.fileSystemProfilePath(v))
            p.fileSystemUri.foreach(v => policies.fileSystemURI(v))
            p.managedLedgerOffloadBucket.foreach(v => policies.managedLedgerOffloadBucket(v))
            p.managedLedgerOffloadRegion.foreach(v => policies.managedLedgerOffloadRegion(v))
            p.managedLedgerOffloadServiceEndpoint.foreach(v => policies.managedLedgerOffloadServiceEndpoint(v))
            p.managedLedgerOffloadMaxBlockSizeInBytes.foreach(v => policies.managedLedgerOffloadMaxBlockSizeInBytes(v))
            p.managedLedgerOffloadReadBufferSizeInBytes.foreach(v => policies.managedLedgerOffloadReadBufferSizeInBytes(v))

            policies.build

        try {
            logger.info(s"Setting offload policies policy for namespace ${request.namespace}")

            request.offloadPolicies match
                case None =>
                    val status = Status(code = Code.INVALID_ARGUMENT.index, "Offload policies should be specified")
                    Future.successful(SetOffloadPoliciesResponse(status = Some(status)))
                case Some(v) =>
                    val offloadPolicies = offloadPoliciesFromPb(v)
                    adminClient.namespaces.setOffloadPolicies(request.namespace, offloadPolicies)
                    Future.successful(SetOffloadPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetOffloadPoliciesResponse(status = Some(status)))
        }

    override def removeOffloadPolicies(request: RemoveOffloadPoliciesRequest): Future[RemoveOffloadPoliciesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing offload policies policy for namespace ${request.namespace}")
            adminClient.namespaces.removeOffloadPolicies(request.namespace)
            Future.successful(RemoveOffloadPoliciesResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveOffloadPoliciesResponse(status = Some(status)))
        }
    override def getPublishRate(request: GetPublishRateRequest): Future[GetPublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val publishRatePb = Option(adminClient.namespaces.getPublishRate(request.namespace)) match
                case None =>
                    pb.GetPublishRateResponse.PublishRate.Unspecified(new PublishRateUnspecified())
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
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPublishRateResponse(status = Some(status)))
        }
    override def setPublishRate(request: SetPublishRateRequest): Future[SetPublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting publish rate policy for namespace ${request.namespace}. ${request.rateInMsg}, ${request.rateInByte}")
            val publishRate = PublishRate(request.rateInMsg, request.rateInByte)
            adminClient.namespaces.setPublishRate(request.namespace, publishRate)
            Future.successful(SetPublishRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetPublishRateResponse(status = Some(status)))
        }
    override def removePublishRate(request: RemovePublishRateRequest): Future[RemovePublishRateResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing publish rate policy for namespace ${request.namespace}")
            adminClient.namespaces.removePublishRate(request.namespace)
            Future.successful(RemovePublishRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemovePublishRateResponse(status = Some(status)))
        }
    override def getResourceGroup(request: GetResourceGroupRequest): Future[GetResourceGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val resourceGroup = Option(adminClient.namespaces.getNamespaceResourceGroup(request.namespace)) match
                case Some(v) if v.length() == 0 =>
                    pb.GetResourceGroupResponse.ResourceGroup.Unspecified(new ResourceGroupUnspecified())
                case Some(v) =>
                    pb.GetResourceGroupResponse.ResourceGroup.Specified(new ResourceGroupSpecified(resourceGroup = v))

            val resourceGroups = Option(adminClient.resourcegroups.getResourceGroups).map(_.asScala.toSeq).getOrElse(Seq.empty[String])

            Future.successful(GetResourceGroupResponse(
                status = Some(Status(code = Code.OK.index)),
                resourceGroup,
                resourceGroups,
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetResourceGroupResponse(status = Some(status)))
        }
    override def setResourceGroup(request: SetResourceGroupRequest): Future[SetResourceGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Setting resource group policy for namespace ${request.namespace}")
            adminClient.namespaces.setNamespaceResourceGroup(request.namespace, request.resourceGroup)
            Future.successful(SetResourceGroupResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetResourceGroupResponse(status = Some(status)))
        }
    override def removeResourceGroup(request: RemoveResourceGroupRequest): Future[RemoveResourceGroupResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            logger.info(s"Removing resource group policy for namespace ${request.namespace}")
            adminClient.namespaces.removeNamespaceResourceGroup(request.namespace)
            Future.successful(RemoveResourceGroupResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveResourceGroupResponse(status = Some(status)))
        }
    override def getPermissions(request: GetPermissionsRequest): Future[GetPermissionsResponse] =
        logger.debug(s"Getting permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        def authActionToPb(authAction: AuthAction): pb.AuthAction =
            authAction match
                case AuthAction.produce => pb.AuthAction.AUTH_ACTION_PRODUCE
                case AuthAction.consume => pb.AuthAction.AUTH_ACTION_CONSUME
                case AuthAction.functions => pb.AuthAction.AUTH_ACTION_FUNCTIONS
                case AuthAction.sources => pb.AuthAction.AUTH_ACTION_SOURCES
                case AuthAction.sinks => pb.AuthAction.AUTH_ACTION_SINKS
                case AuthAction.packages => pb.AuthAction.AUTH_ACTION_PACKAGES
        try {
            val permissions = Option(adminClient.namespaces.getPermissions(request.namespace).asScala.toMap) match
                case None =>
                   val status = Status(code = Code.INTERNAL.index)
                   return Future.successful(GetPermissionsResponse(status = Some(status)))
                case Some(v) =>
                    v.map(x =>
                        x._1 -> new pb.AuthActions(authActions = x._2.asScala.toList.map(authActionToPb))
                    )
            Future.successful(GetPermissionsResponse(
                status = Some(Status(code = Code.OK.index)),
                permissions,
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPermissionsResponse(status = Some(status)))
        }
    override def grantPermissions(request: GrantPermissionsRequest): Future[GrantPermissionsResponse] =
        logger.debug(s"Granting permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        def authActionFromPb(authAction: pb.AuthAction): AuthAction =
            authAction match
                case pb.AuthAction.AUTH_ACTION_PRODUCE => AuthAction.produce
                case pb.AuthAction.AUTH_ACTION_CONSUME => AuthAction.consume
                case pb.AuthAction.AUTH_ACTION_FUNCTIONS => AuthAction.functions
                case pb.AuthAction.AUTH_ACTION_SOURCES => AuthAction.sources
                case pb.AuthAction.AUTH_ACTION_SINKS => AuthAction.sinks
                case pb.AuthAction.AUTH_ACTION_PACKAGES => AuthAction.packages
        try {
            val permissions = adminClient.namespaces.getPermissions(request.namespace).asScala.toMap

            if permissions.exists(_._1 == request.role && request.existenceCheck) then
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = s"There are already granted permissions for this role: ${request.role}. Please choose another role name.")
                return Future.successful(GrantPermissionsResponse(status = Some(status)))

            adminClient.namespaces.grantPermissionOnNamespace(request.namespace, request.role, request.authActions.toList.map(authActionFromPb).toSet.asJava)

            Future.successful(GrantPermissionsResponse(
                status = Some(Status(code = Code.OK.index)),
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GrantPermissionsResponse(status = Some(status)))
        }

    override def revokePermissions (request: RevokePermissionsRequest): Future[RevokePermissionsResponse] =
        logger.debug(s"Revoke permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.revokePermissionsOnNamespace(request.namespace, request.role)

            Future.successful(RevokePermissionsResponse(
                status = Some(Status(code = Code.OK.index)),
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RevokePermissionsResponse(status = Some(status)))
        }

    override def getPermissionOnSubscription(request: GetPermissionOnSubscriptionRequest): Future[GetPermissionOnSubscriptionResponse] =
        logger.debug(s"Getting subscription permissions for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val permissions = Option(adminClient.namespaces.getPermissionOnSubscription(request.namespace).asScala.toMap) match
                case None =>
                    val status = Status(code = Code.INTERNAL.index)
                    return Future.successful(GetPermissionOnSubscriptionResponse(status = Some(status)))
                case Some(v) =>
                    v.collect { case x if x._2.asScala.toList.length > 0 =>
                        x._1 -> new pb.Roles(roles = x._2.asScala.toList)
                    }
            val roles = adminClient.namespaces.getPermissions(request.namespace).asScala.toMap.map(x => x._1).toSeq

            Future.successful(GetPermissionOnSubscriptionResponse(
                status = Some(Status(code = Code.OK.index)),
                permissions,
                roles,
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPermissionOnSubscriptionResponse(status = Some(status)))
        }

    override def grantPermissionOnSubscription(request: GrantPermissionOnSubscriptionRequest): Future[GrantPermissionOnSubscriptionResponse] =
        logger.debug(s"Granting subscription permissions for subscription ${request.subscription} for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val permissions = adminClient.namespaces.getPermissionOnSubscription(request.namespace).asScala.toMap

            if permissions.exists(_._1 == request.subscription && request.existenceCheck) then
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = s"There are already assigned roles for this subscription: ${request.subscription}. Please choose another subscription name.")
                return Future.successful(GrantPermissionOnSubscriptionResponse(status = Some(status)))

            adminClient.namespaces.grantPermissionOnSubscription(request.namespace, request.subscription, request.roles.toSet.asJava)
            Future.successful(GrantPermissionOnSubscriptionResponse(
                status = Some(Status(code = Code.OK.index)),
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GrantPermissionOnSubscriptionResponse(status = Some(status)))
        }

    override def revokePermissionOnSubscription(request: RevokePermissionOnSubscriptionRequest): Future[RevokePermissionOnSubscriptionResponse] =
        logger.debug(s"Revoke roles for subscription ${request.subscription} for namespace: ${request.namespace}")
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.namespaces.grantPermissionOnSubscription(request.namespace, request.subscription, Set().asJava)

            Future.successful(RevokePermissionOnSubscriptionResponse(
                status = Some(Status(code = Code.OK.index)),
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RevokePermissionOnSubscriptionResponse(status = Some(status)))
        }

    override def getProperties(request: GetPropertiesRequest): Future[GetPropertiesResponse] =
        logger.debug(s"Get properties for namespace.")
        val adminClient = RequestContext.pulsarAdmin.get()

        given ExecutionContext = ExecutionContext.global

        try {
            val getPropertiesFutures = request.namespaces.map(ns => adminClient.namespaces.getPropertiesAsync(ns).asScala)
            val propertiesPerNs = Await.result(Future.sequence(getPropertiesFutures), Duration(1, TimeUnit.MINUTES))
                .map(ps => pb.Properties(properties = ps.asScala.toMap))
            val properties = request.namespaces.zip(propertiesPerNs).toMap

            Future.successful(GetPropertiesResponse(
                status = Some(Status(code = Code.OK.index)),
                properties,
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetPropertiesResponse(status = Some(status)))
        }
    override def setProperties(request: SetPropertiesRequest): Future[SetPropertiesResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            val properties = request.properties.asJava

            val existingProperties = adminClient.namespaces.getProperties(request.namespace)

            existingProperties.asScala.map((key, _) =>
                if properties.get(key) == null then
                    adminClient.namespaces.removeProperty(request.namespace, key)
            )

            adminClient.namespaces.setProperties(request.namespace, request.properties.asJava)

            Future.successful(SetPropertiesResponse(
                status = Some(Status(code = Code.OK.index)),
            ))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetPropertiesResponse(status = Some(status)))
        }
