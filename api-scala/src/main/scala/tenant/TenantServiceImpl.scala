package tenant

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.tenant.v1.tenant as tenantPbLib
import com.tools.teal.pulsar.ui.tenant.v1.tenant.{CreateTenantRequest, CreateTenantResponse, DeleteTenantRequest, DeleteTenantResponse, GetTenantRequest, GetTenantResponse, ListTenantsRequest, ListTenantsResponse, TenantServiceGrpc, UpdateTenantRequest, UpdateTenantResponse}
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import org.apache.pulsar.common.policies.data.TenantInfo
import scala.jdk.CollectionConverters.*

import scala.concurrent.Future

class TenantServiceImpl extends TenantServiceGrpc.TenantService:
    val logger: Logger = Logger(getClass.getName)

    override def createTenant(request: CreateTenantRequest): Future[CreateTenantResponse] =
        logger.info(s"Creating tenant: ${request.tenantName}")

        val config = TenantInfo.builder

        request.tenantInfo match
            case Some(ti) =>
                config.adminRoles(ti.adminRoles.toSet.asJava)
                config.allowedClusters(ti.allowedClusters.toSet.asJava)
            case None => // do nothing

        try {
            adminClient.tenants.createTenant(request.tenantName, config.build)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreateTenantResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateTenantResponse(status = Some(status)))
        }


    override def updateTenant(request: UpdateTenantRequest): Future[UpdateTenantResponse] =
        logger.info(s"Updating tenant: ${request.tenantName}")

        val config = TenantInfo.builder

        request.tenantInfo match
            case Some(ti) =>
                config.adminRoles(ti.adminRoles.toSet.asJava)
                config.allowedClusters(ti.allowedClusters.toSet.asJava)
            case None => // do nothing

        try {
            adminClient.tenants.updateTenant(request.tenantName, config.build)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(UpdateTenantResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateTenantResponse(status = Some(status)))
        }

    override def deleteTenant(request: DeleteTenantRequest): Future[DeleteTenantResponse] =
        logger.info(s"Deleting tenant: ${request.tenantName}")

        try {
            adminClient.tenants.deleteTenant(request.tenantName, request.force)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(DeleteTenantResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteTenantResponse(status = Some(status)))
        }

    override def getTenant(request: GetTenantRequest): Future[GetTenantResponse] =
        logger.info(s"Getting tenant: ${request.tenantName}")

        val tenant = try {
            adminClient.tenants.getTenantInfo(request.tenantName)
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(GetTenantResponse(status = Some(status)))
        }

        val tenantInfoPb = tenantPbLib.TenantInfo(
            adminRoles = tenant.getAdminRoles().asScala.toSeq,
            allowedClusters = tenant.getAllowedClusters().asScala.toSeq
        )

        val status: Status = Status(code = Code.OK.index)
        Future.successful(GetTenantResponse(
            status = Some(status),
            tenantName = request.tenantName,
            tenantInfo = Some(tenantInfoPb)
        ))

    override def listTenants(request: ListTenantsRequest): Future[ListTenantsResponse] =
        logger.info(s"Listing tenants")

        val tenants = try {
            adminClient.tenants.getTenants
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(ListTenantsResponse(status = Some(status)))
        }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(ListTenantsResponse(status = Some(status), tenants = tenants.asScala.toSeq))
