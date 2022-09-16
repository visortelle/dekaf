package namespace

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.namespace.v1.namespace.{
    CreateNamespaceRequest,
    CreateNamespaceResponse,
    DeleteNamespaceAntiAffinityGroupRequest,
    DeleteNamespaceAntiAffinityGroupResponse,
    DeleteNamespaceRequest,
    DeleteNamespaceResponse,
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
            val autoSubscriptionCreation =
                adminClient.namespaces.getAutoSubscriptionCreation(request.namespace).isAllowAutoSubscriptionCreation
            Future.successful(
              GetAutoSubscriptionCreationResponse(
                status = Some(Status(code = Code.OK.index)),
                autoSubscriptionCreation
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetAutoSubscriptionCreationResponse(status = Some(status)))

        }

    override def setAutoSubscriptionCreation(request: SetAutoSubscriptionCreationRequest): Future[SetAutoSubscriptionCreationResponse] =
        try {
            val autoSubscriptionCreationOverride = AutoSubscriptionCreationOverride.builder
                .allowAutoSubscriptionCreation(request.autoSubscriptionCreation)
                .build()
            adminClient.namespaces.setAutoSubscriptionCreation(request.namespace, autoSubscriptionCreationOverride)
            Future.successful(SetAutoSubscriptionCreationResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(SetAutoSubscriptionCreationResponse(status = Some(status)))

        }

    override def removeAutoSubscriptionCreation(
        request: RemoveAutoSubscriptionCreationRequest
    ): Future[RemoveAutoSubscriptionCreationResponse] =
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
            val autoTopicCreation = adminClient.namespaces.getAutoTopicCreation(request.namespace)
            val autoTopicCreationPb = pb.AutoTopicCreation(
              allowAutoTopicCreation = autoTopicCreation.isAllowAutoTopicCreation,
              topicType = autoTopicCreation.getTopicType match
                  case "partitioned"     => pb.TopicType.TOPIC_TYPE_PARTITIONED
                  case "non-partitioned" => pb.TopicType.TOPIC_TYPE_NON_PARTITIONED
                  case _                 => pb.TopicType.TOPIC_TYPE_UNSPECIFIED
              ,
              defaultNumPartitions = autoTopicCreation.getDefaultNumPartitions
            )
            Future.successful(
              GetAutoTopicCreationResponse(
                status = Some(Status(code = Code.OK.index)),
                autoTopicCreation = Some(autoTopicCreationPb)
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetAutoTopicCreationResponse(status = Some(status)))
        }

    override def setAutoTopicCreation(request: SetAutoTopicCreationRequest): Future[SetAutoTopicCreationResponse] =
        try {
            val topicType = request.getAutoTopicCreation.topicType match
                case pb.TopicType.TOPIC_TYPE_PARTITIONED     => "partitioned"
                case pb.TopicType.TOPIC_TYPE_NON_PARTITIONED => "non-partitioned"
                case _                                       => "non-partitioned"

            val autoTopicCreation = AutoTopicCreationOverride.builder
                .allowAutoTopicCreation(request.getAutoTopicCreation.allowAutoTopicCreation)
                .topicType(topicType)
                .defaultNumPartitions(request.getAutoTopicCreation.defaultNumPartitions)
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
        try {
            val backlogQuotaMap = adminClient.namespaces.getBacklogQuotaMap(request.namespace).asScala.toMap
            Future.successful(GetBacklogQuotasResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetBacklogQuotasResponse(status = Some(status)))
        }

    override def setBacklogQuotas(request: SetBacklogQuotasRequest): Future[SetBacklogQuotasResponse] = ???

    override def removeBacklogQuota(request: RemoveBacklogQuotaRequest): Future[RemoveBacklogQuotaResponse] = ???

    override def getNamespaceAntiAffinityGroup(
        request: GetNamespaceAntiAffinityGroupRequest
    ): Future[GetNamespaceAntiAffinityGroupResponse] = ???

    override def setNamespaceAntiAffinityGroup(
        request: SetNamespaceAntiAffinityGroupRequest
    ): Future[SetNamespaceAntiAffinityGroupResponse] = ???

    override def deleteNamespaceAntiAffinityGroup(
        request: DeleteNamespaceAntiAffinityGroupRequest
    ): Future[DeleteNamespaceAntiAffinityGroupResponse] = ???
