package namespace

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.namespace.v1.namespace.{
    GetIsAllowAutoUpdateSchemaRequest,
    GetIsAllowAutoUpdateSchemaResponse,
    GetSchemaCompatibilityStrategyRequest,
    GetSchemaCompatibilityStrategyResponse,
    GetSchemaValidationEnforceRequest,
    GetSchemaValidationEnforceResponse,
    NamespaceServiceGrpc,
    SetIsAllowAutoUpdateSchemaRequest,
    SetIsAllowAutoUpdateSchemaResponse,
    SetSchemaCompatibilityStrategyRequest,
    SetSchemaCompatibilityStrategyResponse,
    SetSchemaValidationEnforceRequest,
    SetSchemaValidationEnforceResponse
}
import com.typesafe.scalalogging.Logger
import com.google.rpc.code.Code
import com.google.rpc.status.Status

import scala.concurrent.Future

class NamespaceServiceImpl extends NamespaceServiceGrpc.NamespaceService:
    val logger: Logger = Logger(getClass.getName)

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
