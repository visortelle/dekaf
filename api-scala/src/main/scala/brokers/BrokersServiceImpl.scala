package brokers

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.brokers.v1.brokers as pb
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.brokers.v1.brokers.{
    GetAllDynamicConfigurationsRequest,
    GetAllDynamicConfigurationsResponse,
    GetDynamicConfigurationNamesRequest,
    GetDynamicConfigurationNamesResponse,
    GetInternalConfigurationDataRequest,
    GetInternalConfigurationDataResponse,
    GetRuntimeConfigurationsRequest,
    GetRuntimeConfigurationsResponse,
    UpdateDynamicConfigurationRequest,
    UpdateDynamicConfigurationResponse
}

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
              zookeeperServers = internalConfigurationData.getZookeeperServers,
              configurationStoreServers = internalConfigurationData.getConfigurationStoreServers,
              bookkeeperMetadataServiceUri = internalConfigurationData.getBookkeeperMetadataServiceUri,
              stateStorageServiceUrl = internalConfigurationData.getStateStorageServiceUrl
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
}
