package namespace

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.namespace.v1.namespace.{CompactionThresholdEnabled, CreateNamespaceRequest, CreateNamespaceResponse, DeduplicationSnapshotIntervalDisabled, DeduplicationSnapshotIntervalEnabled, DeduplicationSpecified, DeduplicationUnspecified, DelayedDeliverySpecified, DelayedDeliveryUnspecified, DeleteNamespaceRequest, DeleteNamespaceResponse, DispatchRateSpecified, DispatchRateUnspecified, GetAntiAffinityNamespacesRequest, GetAntiAffinityNamespacesResponse, GetAutoSubscriptionCreationRequest, GetAutoSubscriptionCreationResponse, GetAutoTopicCreationRequest, GetAutoTopicCreationResponse, GetBacklogQuotasRequest, GetBacklogQuotasResponse, GetBookieAffinityGroupRequest, GetBookieAffinityGroupResponse, GetCompactionThresholdRequest, GetCompactionThresholdResponse, GetDeduplicationRequest, GetDeduplicationResponse, GetDeduplicationSnapshotIntervalRequest, GetDeduplicationSnapshotIntervalResponse, GetDelayedDeliveryRequest, GetDelayedDeliveryResponse, GetDispatchRateRequest, GetDispatchRateResponse, GetIsAllowAutoUpdateSchemaRequest, GetIsAllowAutoUpdateSchemaResponse, GetNamespaceAntiAffinityGroupRequest, GetNamespaceAntiAffinityGroupResponse, GetSchemaCompatibilityStrategyRequest, GetSchemaCompatibilityStrategyResponse, GetSchemaValidationEnforceRequest, GetSchemaValidationEnforceResponse, NamespaceServiceGrpc, RemoveAutoSubscriptionCreationRequest, RemoveAutoSubscriptionCreationResponse, RemoveAutoTopicCreationRequest, RemoveAutoTopicCreationResponse, RemoveBacklogQuotaRequest, RemoveBacklogQuotaResponse, RemoveBookieAffinityGroupRequest, RemoveBookieAffinityGroupResponse, RemoveCompactionThresholdRequest, RemoveCompactionThresholdResponse, RemoveDeduplicationRequest, RemoveDeduplicationResponse, RemoveDeduplicationSnapshotIntervalRequest, RemoveDeduplicationSnapshotIntervalResponse, RemoveDelayedDeliveryRequest, RemoveDelayedDeliveryResponse, RemoveDispatchRateRequest, RemoveDispatchRateResponse, RemoveNamespaceAntiAffinityGroupRequest, RemoveNamespaceAntiAffinityGroupResponse, SetAutoSubscriptionCreationRequest, SetAutoSubscriptionCreationResponse, SetAutoTopicCreationRequest, SetAutoTopicCreationResponse, SetBacklogQuotasRequest, SetBacklogQuotasResponse, SetBookieAffinityGroupRequest, SetBookieAffinityGroupResponse, SetCompactionThresholdRequest, SetCompactionThresholdResponse, SetDeduplicationRequest, SetDeduplicationResponse, SetDeduplicationSnapshotIntervalRequest, SetDeduplicationSnapshotIntervalResponse, SetDelayedDeliveryRequest, SetDelayedDeliveryResponse, SetDispatchRateRequest, SetDispatchRateResponse, SetIsAllowAutoUpdateSchemaRequest, SetIsAllowAutoUpdateSchemaResponse, SetNamespaceAntiAffinityGroupRequest, SetNamespaceAntiAffinityGroupResponse, SetSchemaCompatibilityStrategyRequest, SetSchemaCompatibilityStrategyResponse, SetSchemaValidationEnforceRequest, SetSchemaValidationEnforceResponse}
import com.tools.teal.pulsar.ui.namespace.v1.namespace as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import org.apache.pulsar.common.policies.data.BacklogQuota.{BacklogQuotaType, RetentionPolicy, builder as BacklogQuotaBuilder}
import org.apache.pulsar.common.policies.data.{AutoSubscriptionCreationOverride, AutoTopicCreationOverride, BookieAffinityGroupData, BundlesData, DelayedDeliveryPolicies, DispatchRate, Policies}

import scala.jdk.CollectionConverters.*
import scala.concurrent.Future

class NamespaceServiceImpl extends NamespaceServiceGrpc.NamespaceService:
    val logger: Logger = Logger(getClass.getName)

    override def createNamespace(request: CreateNamespaceRequest): Future[CreateNamespaceResponse] =
        logger.info(s"Creating namespace ${request.namespaceName}")

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

        try {
            adminClient.namespaces.deleteNamespace(request.namespaceName, request.force)

            val status = Status(code = Code.OK.index)
            Future.successful(DeleteNamespaceResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteNamespaceResponse(status = Some(status)))
        }

    override def getIsAllowAutoUpdateSchema(request: GetIsAllowAutoUpdateSchemaRequest): Future[GetIsAllowAutoUpdateSchemaResponse] =
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

        try {
            adminClient.namespaces.setIsAllowAutoUpdateSchema(request.namespace, request.isAllowAutoUpdateSchema)
            val status = Status(code = Code.OK.index)
            Future.successful(SetIsAllowAutoUpdateSchemaResponse(status = Some(status)))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetIsAllowAutoUpdateSchemaResponse(status = Some(status)))

        }

    override def getSchemaCompatibilityStrategy(
        request: GetSchemaCompatibilityStrategyRequest
    ): Future[GetSchemaCompatibilityStrategyResponse] =
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

    override def setSchemaCompatibilityStrategy(
        request: SetSchemaCompatibilityStrategyRequest
    ): Future[SetSchemaCompatibilityStrategyResponse] =
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

            val autoTopicCreation = AutoTopicCreationOverride.builder
                .allowAutoTopicCreation(autoTopicCreationOverridePb.isAllowTopicCreation)
                .topicType(topicType)
                .defaultNumPartitions(autoTopicCreationOverridePb.defaultNumPartitions)
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

        try {
            adminClient.namespaces.removeAutoTopicCreation(request.namespace)
            Future.successful(RemoveAutoTopicCreationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveAutoTopicCreationResponse(status = Some(status)))
        }

    override def getBacklogQuotas(request: GetBacklogQuotasRequest): Future[GetBacklogQuotasResponse] =
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
        try
            adminClient.namespaces.setNamespaceAntiAffinityGroup(request.namespace, request.namespaceAntiAffinityGroup)
            Future.successful(SetNamespaceAntiAffinityGroupResponse(status = Some(Status(code = Code.OK.index))))
        catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetNamespaceAntiAffinityGroupResponse(status = Some(status)))
        }

    override def removeNamespaceAntiAffinityGroup(request: RemoveNamespaceAntiAffinityGroupRequest): Future[RemoveNamespaceAntiAffinityGroupResponse] =
        try
            adminClient.namespaces.deleteNamespaceAntiAffinityGroup(request.namespace)
            Future.successful(RemoveNamespaceAntiAffinityGroupResponse(status = Some(Status(code = Code.OK.index))))
        catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveNamespaceAntiAffinityGroupResponse(status = Some(status)))
        }

    override def getAntiAffinityNamespaces(request: GetAntiAffinityNamespacesRequest): Future[GetAntiAffinityNamespacesResponse] =
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
        try {
            logger.info(s"Removing dispatch rate policy for namespace ${request.namespace}")
            adminClient.namespaces.removeDispatchRate(request.namespace)
            Future.successful(RemoveDispatchRateResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveDispatchRateResponse(status = Some(status)))
        }
