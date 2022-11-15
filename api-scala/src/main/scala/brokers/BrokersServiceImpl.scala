package brokers

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.brokers.v1.brokers as pb
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.brokers.v1.brokers.{
    BacklogQuotaCheckRequest,
    BacklogQuotaCheckResponse,
    DeleteDynamicConfigurationRequest,
    DeleteDynamicConfigurationResponse,
    GetAllDynamicConfigurationsRequest,
    GetAllDynamicConfigurationsResponse,
    GetDynamicConfigurationNamesRequest,
    GetDynamicConfigurationNamesResponse,
    GetInternalConfigurationDataRequest,
    GetInternalConfigurationDataResponse,
    GetRuntimeConfigurationsRequest,
    GetRuntimeConfigurationsResponse,
    HealthCheckRequest,
    HealthCheckResponse,
    UpdateDynamicConfigurationRequest,
    UpdateDynamicConfigurationResponse,

    GetResourceGroupsRequest,
    GetResourceGroupsResponse,
    CreateResourceGroupRequest,
    CreateResourceGroupResponse,
    UpdateResourceGroupRequest,
    UpdateResourceGroupResponse,
    DeleteResourceGroupRequest,
    DeleteResourceGroupResponse,
}
import org.apache.pulsar.common.naming.TopicVersion
//import org.apache.pulsar.common.policies.data.{ ResourceGroup }

import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class BrokersServiceImpl extends pb.BrokersServiceGrpc.BrokersService {
    override def getAllDynamicConfigurations(request: GetAllDynamicConfigurationsRequest): Future[GetAllDynamicConfigurationsResponse] =
        try {
            val config = adminClient.brokers.getAllDynamicConfigurations.asScala.toMap
            Future.successful(
              GetAllDynamicConfigurationsResponse(
                status = Some(Status(code = Code.OK.index)),
                config
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetAllDynamicConfigurationsResponse(status = Some(status)))
        }

    override def getDynamicConfigurationNames(request: GetDynamicConfigurationNamesRequest): Future[GetDynamicConfigurationNamesResponse] =
        try {
            val names = adminClient.brokers.getDynamicConfigurationNames.asScala.toList
            Future.successful(
              GetDynamicConfigurationNamesResponse(
                status = Some(Status(code = Code.OK.index)),
                names
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetDynamicConfigurationNamesResponse(status = Some(status)))
        }

    override def getInternalConfigurationData(request: GetInternalConfigurationDataRequest): Future[GetInternalConfigurationDataResponse] =
        try {
            val internalConfigurationData = adminClient.brokers.getInternalConfigurationData
            val config = pb.InternalConfigurationData(
              zookeeperServers = Option(internalConfigurationData.getZookeeperServers).getOrElse(""),
              configurationStoreServers = Option(internalConfigurationData.getConfigurationStoreServers).getOrElse(""),
              bookkeeperMetadataServiceUri = Option(internalConfigurationData.getBookkeeperMetadataServiceUri).getOrElse(""),
              stateStorageServiceUrl = Option(internalConfigurationData.getStateStorageServiceUrl).getOrElse("")
            )

            Future.successful(
              GetInternalConfigurationDataResponse(
                status = Some(Status(code = Code.OK.index)),
                config = Some(config)
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetInternalConfigurationDataResponse(status = Some(status)))
        }

    override def getRuntimeConfigurations(request: GetRuntimeConfigurationsRequest): Future[GetRuntimeConfigurationsResponse] =
        try {
            val config = adminClient.brokers.getRuntimeConfigurations.asScala.toMap
            Future.successful(
              GetRuntimeConfigurationsResponse(
                status = Some(Status(code = Code.OK.index)),
                config
              )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetRuntimeConfigurationsResponse(status = Some(status)))
        }

    override def updateDynamicConfiguration(request: UpdateDynamicConfigurationRequest): Future[UpdateDynamicConfigurationResponse] =
        try {
            adminClient.brokers.updateDynamicConfiguration(request.name, request.value)
            Future.successful(
              UpdateDynamicConfigurationResponse(status = Some(Status(code = Code.OK.index)))
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateDynamicConfigurationResponse(status = Some(status)))
        }

    override def deleteDynamicConfiguration(request: DeleteDynamicConfigurationRequest): Future[DeleteDynamicConfigurationResponse] =
        try {
            adminClient.brokers.deleteDynamicConfiguration(request.name)
            Future.successful(
              DeleteDynamicConfigurationResponse(status = Some(Status(code = Code.OK.index)))
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteDynamicConfigurationResponse(status = Some(status)))
        }

    override def healthCheck(request: HealthCheckRequest): Future[HealthCheckResponse] =
        try {
            adminClient.brokers.healthcheck(TopicVersion.V2)
            Future.successful(
              HealthCheckResponse(status = Some(Status(code = Code.OK.index)), isOk = true)
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(HealthCheckResponse(status = Some(status), isOk = false))
        }

    override def backlogQuotaCheck(request: BacklogQuotaCheckRequest): Future[BacklogQuotaCheckResponse] =
        try {
            adminClient.brokers.backlogQuotaCheck
            Future.successful(
              BacklogQuotaCheckResponse(status = Some(Status(code = Code.OK.index)), isOk = true)
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(BacklogQuotaCheckResponse(status = Some(status), isOk = false))
        }
    override def getResourceGroups(request: GetResourceGroupsRequest): Future[GetResourceGroupsResponse] =
        try {
            val resourceGroupsNames = Option(adminClient.resourcegroups.getResourceGroups).map(_.asScala.toSeq).getOrElse(Seq.empty[String])

            // TODO rewrite async
            val resourceGroups = resourceGroupsNames.map(group => {
                val resource = adminClient.resourcegroups.getResourceGroup(group)
                pb.ResourceGroup(
                    publishRateInMsgs = Option(resource.getPublishRateInMsgs),
                    publishRateInBytes = Option(resource.getPublishRateInBytes),
                    dispatchRateInMsgs = Option(resource.getDispatchRateInMsgs),
                    dispatchRateInBytes = Option(resource.getDispatchRateInBytes),
                    name = group
                )
            })

            Future.successful(
                GetResourceGroupsResponse(
                    status = Some(Status(code = Code.OK.index)),
                    resourceGroups
                )
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetResourceGroupsResponse(status = Some(status)))
        }

    override def createResourceGroup(request: CreateResourceGroupRequest): Future[CreateResourceGroupResponse] =
        try {
//            logger.info(s"Setting dispatch rate policy for namespace ${request.namespace}")
//            val dispatchRate = DispatchRate.builder
//                .dispatchThrottlingRateInByte(request.rateInByte)
//                .dispatchThrottlingRateInMsg(request.rateInMsg)
//                .ratePeriodInSecond(request.periodInSecond)
//                .relativeToPublishRate(request.isRelativeToPublishRate)
//                .build
//            adminClient.namespaces.setDispatchRate(request.namespace, dispatchRate)
//            val resourceGroup = pb.ResourceGroup



//            val resourceGroupName = request.resourceGroup
//            request.resourceGroup match
//                case Some(name) =>
//                    var resourceGroup =
//                    var backlogQuotaBuilder = BacklogQuotaBuilder.limitTime(quotaPb.limitTime)
//
//                    quotaPb.retentionPolicy match
//                        case Some(retentionPolicy) =>
//                            backlogQuotaBuilder = backlogQuotaBuilder.retentionPolicy(retentionPolicyFromPb(retentionPolicy))
//                        case _ =>
//
//                    val backlogQuota = backlogQuotaBuilder.build
//
//                    logger.info(s"Setting backlog quota (message age) on topic ${request.topic} to ${backlogQuota}")
//                    adminClient.topicPolicies(request.isGlobal).setBacklogQuota(request.topic, backlogQuota, BacklogQuotaType.message_age)

            val groupName = request.resourceGroup.get.name;
            val resourceGroup = Map(
                "publishRateInMsgs" -> request.resourceGroup.get.publishRateInMsgs,
                "publishRateInBytes" -> request.resourceGroup.get.publishRateInBytes,
                "dispatchRateInMsgs" -> request.resourceGroup.get.dispatchRateInMsgs,
                "dispatchRateInBytes" -> request.resourceGroup.get.dispatchRateInBytes,
            )
            println(s"REQUEST: ${request}")
            adminClient.resourcegroups.createResourceGroup(groupName, resourceGroup)
            Future.successful(CreateResourceGroupResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateResourceGroupResponse(status = Some(status)))
        }
    override def deleteResourceGroup(request: DeleteResourceGroupRequest): Future[DeleteResourceGroupResponse] = ???
    override def updateResourceGroup(request: UpdateResourceGroupRequest): Future[UpdateResourceGroupResponse] = ???
}


