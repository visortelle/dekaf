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
import org.apache.pulsar.common.policies.data.{ ResourceGroup }

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
            val groupName = request.getResourceGroup.name
            val resourceGroup = new ResourceGroup;
            resourceGroup.setDispatchRateInBytes(request.getResourceGroup.dispatchRateInBytes.get)
            resourceGroup.setDispatchRateInMsgs(request.getResourceGroup.dispatchRateInMsgs.get)
            resourceGroup.setPublishRateInBytes(request.getResourceGroup.publishRateInBytes.get)
            resourceGroup.setPublishRateInMsgs(request.getResourceGroup.publishRateInMsgs.get)

            adminClient.resourcegroups.createResourceGroup(groupName, resourceGroup)
            Future.successful(CreateResourceGroupResponse(status = Some(Status(code = Code.OK.index))))
        } catch {
            err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateResourceGroupResponse(status = Some(status)))
        }
    override def deleteResourceGroup(request: DeleteResourceGroupRequest): Future[DeleteResourceGroupResponse] =
        try {
            adminClient.resourcegroups.deleteResourceGroup(request.name)
            Future.successful(
                DeleteResourceGroupResponse(status = Some(Status(code = Code.OK.index)))
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteResourceGroupResponse(status = Some(status)))
        }

    override def updateResourceGroup(request: UpdateResourceGroupRequest): Future[UpdateResourceGroupResponse] =
        try {
            val groupName = request.getResourceGroup.name
            val resourceGroup = new ResourceGroup;
            resourceGroup.setDispatchRateInBytes(request.getResourceGroup.dispatchRateInBytes.get)
            resourceGroup.setDispatchRateInMsgs(request.getResourceGroup.dispatchRateInMsgs.get)
            resourceGroup.setPublishRateInBytes(request.getResourceGroup.publishRateInBytes.get)
            resourceGroup.setPublishRateInMsgs(request.getResourceGroup.publishRateInMsgs.get)

            adminClient.resourcegroups.updateResourceGroup(groupName, resourceGroup)
            Future.successful(
                UpdateResourceGroupResponse(status = Some(Status(code = Code.OK.index)))
            )
        } catch {
            case err =>
                val status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateResourceGroupResponse(status = Some(status)))
        }
}

