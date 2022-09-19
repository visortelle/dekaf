package namespace

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.namespace.v1.namespace.{
    CreateNamespaceRequest,
    CreateNamespaceResponse,
    DeleteNamespaceAntiAffinityGroupRequest,
    DeleteNamespaceAntiAffinityGroupResponse,
    DeleteNamespaceRequest,
    DeleteNamespaceResponse,
    GetAntiAffinityNamespacesRequest,
    GetAntiAffinityNamespacesResponse,
    GetAutoSubscriptionCreationRequest,
    GetAutoSubscriptionCreationResponse,
    GetAutoTopicCreationRequest,
    GetAutoTopicCreationResponse,
    GetBacklogQuotasRequest,
    GetBacklogQuotasResponse,
    GetIsAllowAutoUpdateSchemaRequest,
    GetIsAllowAutoUpdateSchemaResponse,
    GetNamespaceAntiAffinityGroupRequest,
    GetNamespaceAntiAffinityGroupResponse,
    GetSchemaCompatibilityStrategyRequest,
    GetSchemaCompatibilityStrategyResponse,
    GetSchemaValidationEnforceRequest,
    GetSchemaValidationEnforceResponse,
    NamespaceServiceGrpc,
    RemoveAutoSubscriptionCreationRequest,
    RemoveAutoSubscriptionCreationResponse,
    RemoveAutoTopicCreationRequest,
    RemoveAutoTopicCreationResponse,
    RemoveBacklogQuotaRequest,
    RemoveBacklogQuotaResponse,
    SetAutoSubscriptionCreationRequest,
    SetAutoSubscriptionCreationResponse,
    SetAutoTopicCreationRequest,
    SetAutoTopicCreationResponse,
    SetBacklogQuotasRequest,
    SetBacklogQuotasResponse,
    SetIsAllowAutoUpdateSchemaRequest,
    SetIsAllowAutoUpdateSchemaResponse,
    SetNamespaceAntiAffinityGroupRequest,
    SetNamespaceAntiAffinityGroupResponse,
    SetSchemaCompatibilityStrategyRequest,
    SetSchemaCompatibilityStrategyResponse,
    SetSchemaValidationEnforceRequest,
    SetSchemaValidationEnforceResponse
}
import com.tools.teal.pulsar.ui.namespace.v1.namespace as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import org.apache.pulsar.common.policies.data.BacklogQuota.{builder as BacklogQuotaBuilder, BacklogQuotaType, RetentionPolicy}
import org.apache.pulsar.common.policies.data.{AutoSubscriptionCreationOverride, AutoTopicCreationOverride, BundlesData, Policies}

import scala.jdk.CollectionConverters.*
import scala.concurrent.Future

class NamespaceServiceImpl extends NamespaceServiceGrpc.NamespaceService:
    val logger: Logger = Logger(getClass.getName)

    override def createNamespace(request: CreateNamespaceRequest): Future[CreateNamespaceResponse] =
        logger.info(s"Creating namespace: ${request.namespaceName}")

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
        logger.info(s"Deleting namespace: ${request.namespaceName}")

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
        logger.info(s"Getting is allow auto update schema for namespace: ${request.namespace}")

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
        logger.info(s"Setting is allow auto update schema for namespace: ${request.namespace}. Value: ${request.isAllowAutoUpdateSchema}")

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
        logger.info(s"Getting schema compatibility strategy for namespace: ${request.namespace}")

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
        logger.info(s"Setting schema compatibility strategy for namespace: ${request.namespace}")

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
            val autoSubscriptionCreationOverride = request.autoSubscriptionCreation match
                case pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_ENABLED =>
                    AutoSubscriptionCreationOverride.builder.allowAutoSubscriptionCreation(true).build()
                case pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_DISABLED =>
                    AutoSubscriptionCreationOverride.builder.allowAutoSubscriptionCreation(false).build()
                case _ =>
                    val status = Status(code = Code.INVALID_ARGUMENT.index, message = "Wrong allow subscription creation argument received.")
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
        try {
            adminClient.namespaces.removeAutoTopicCreation(request.namespace)
            Future.successful(RemoveAutoTopicCreationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(RemoveAutoTopicCreationResponse(status = Some(status)))
        }

    override def getBacklogQuotas(request: GetBacklogQuotasRequest): Future[GetBacklogQuotasResponse] =
        def retentionPolicyToPb(policy: RetentionPolicy): pb.RetentionPolicy = policy match
            case RetentionPolicy.consumer_backlog_eviction => pb.RetentionPolicy.RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION
            case RetentionPolicy.producer_request_hold     => pb.RetentionPolicy.RETENTION_POLICY_PRODUCER_REQUEST_HOLD
            case RetentionPolicy.producer_exception        => pb.RetentionPolicy.RETENTION_POLICY_EXCEPTION

        try {
            val backlogQuotaMap = adminClient.namespaces.getBacklogQuotaMap(request.namespace).asScala.toMap
            val backlogQuotasPb = backlogQuotaMap.map { case (quotaType, quota) =>
                quotaType match
                    case BacklogQuotaType.destination_storage =>
                        pb.BacklogQuota(
                          limitSize = Option(quota.getLimitSize).getOrElse(-1),
                          limitTime = Option(quota.getLimitTime).getOrElse(-1),
                          retentionPolicy = retentionPolicyToPb(Option(quota.getPolicy).getOrElse(RetentionPolicy.producer_exception)),
                          backlogQuotaType = pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_DESTINATION_STORAGE
                        )
                    case BacklogQuotaType.message_age =>
                        pb.BacklogQuota(
                          limitSize = Option(quota.getLimitSize).getOrElse(-1),
                          limitTime = Option(quota.getLimitTime).getOrElse(-1),
                          retentionPolicy = retentionPolicyToPb(Option(quota.getPolicy).getOrElse(RetentionPolicy.producer_exception)),
                          backlogQuotaType = pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_MESSAGE_AGE
                        )
            }.toList

            Future.successful(
              GetBacklogQuotasResponse(
                status = Some(Status(code = Code.OK.index)),
                backlogQuotas = backlogQuotasPb
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetBacklogQuotasResponse(status = Some(status)))
        }

    override def setBacklogQuotas(request: SetBacklogQuotasRequest): Future[SetBacklogQuotasResponse] =
        def retentionPolicyFromPb(policyPb: pb.RetentionPolicy): RetentionPolicy = policyPb match
            case pb.RetentionPolicy.RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION => RetentionPolicy.consumer_backlog_eviction
            case pb.RetentionPolicy.RETENTION_POLICY_PRODUCER_REQUEST_HOLD     => RetentionPolicy.producer_request_hold
            case pb.RetentionPolicy.RETENTION_POLICY_EXCEPTION                 => RetentionPolicy.producer_exception
            case _                                                             => RetentionPolicy.producer_exception

        def quotaTypeFromPb(quotaTypePb: pb.BacklogQuotaType): BacklogQuotaType = quotaTypePb match
            case pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_MESSAGE_AGE         => BacklogQuotaType.message_age
            case pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_DESTINATION_STORAGE => BacklogQuotaType.destination_storage
            case _                                                          => BacklogQuotaType.destination_storage

        try {
            request.backlogQuotas.foreach(quotaPb =>
                val backlogQuota = BacklogQuotaBuilder
                    .limitSize(quotaPb.limitSize)
                    .limitTime(quotaPb.limitTime)
                    .retentionPolicy(retentionPolicyFromPb(quotaPb.retentionPolicy))
                    .build()
                val quotaType = quotaTypeFromPb(quotaPb.backlogQuotaType)
                adminClient.namespaces.setBacklogQuota(request.namespace, backlogQuota, quotaType)
            )
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
                    adminClient.namespaces.removeBacklogQuota(request.namespace, BacklogQuotaType.destination_storage)
                case pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_MESSAGE_AGE =>
                    adminClient.namespaces.removeBacklogQuota(request.namespace, BacklogQuotaType.message_age)
                case _ =>
                    val status = Status(code = Code.INVALID_ARGUMENT.index, message = "Backlog quota type should be specified.")
                    return Future.successful(RemoveBacklogQuotaResponse(status = Some(status)))

            Future.successful(RemoveBacklogQuotaResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
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

    override def deleteNamespaceAntiAffinityGroup(request: DeleteNamespaceAntiAffinityGroupRequest): Future[DeleteNamespaceAntiAffinityGroupResponse] =
        try
            adminClient.namespaces.deleteNamespaceAntiAffinityGroup(request.namespace)
            Future.successful(DeleteNamespaceAntiAffinityGroupResponse(status = Some(Status(code = Code.OK.index))))
        catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteNamespaceAntiAffinityGroupResponse(status = Some(status)))
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
