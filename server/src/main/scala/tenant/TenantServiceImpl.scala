package tenant

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.tenant.v1.tenant as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import org.apache.pulsar.common.policies.data.TenantInfo
import scala.jdk.CollectionConverters.*

import scala.concurrent.Future

class TenantServiceImpl extends pb.TenantServiceGrpc.TenantService:
    val logger: Logger = Logger(getClass.getName)

    override def createTenant(request: pb.CreateTenantRequest): Future[pb.CreateTenantResponse] =
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
            Future.successful(pb.CreateTenantResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.CreateTenantResponse(status = Some(status)))
        }

    override def updateTenant(request: pb.UpdateTenantRequest): Future[pb.UpdateTenantResponse] =
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
            Future.successful(pb.UpdateTenantResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.UpdateTenantResponse(status = Some(status)))
        }

    override def deleteTenant(request: pb.DeleteTenantRequest): Future[pb.DeleteTenantResponse] =
        logger.info(s"Deleting tenant: ${request.tenantName}")
        try {
            adminClient.tenants.deleteTenant(request.tenantName, request.force)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteTenantResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.DeleteTenantResponse(status = Some(status)))
        }

    override def getTenant(request: pb.GetTenantRequest): Future[pb.GetTenantResponse] =
        logger.debug(s"Getting tenant: ${request.tenantName}")

        val tenant = try {
            adminClient.tenants.getTenantInfo(request.tenantName)
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(pb.GetTenantResponse(status = Some(status)))
        }

        val tenantInfoPb = pb.TenantInfo(
            adminRoles = tenant.getAdminRoles.asScala.toSeq,
            allowedClusters = tenant.getAllowedClusters.asScala.toSeq
        )

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.GetTenantResponse(
            status = Some(status),
            tenantName = request.tenantName,
            tenantInfo = Some(tenantInfoPb)
        ))

    override def getTenants(request: pb.GetTenantsRequest): Future[pb.GetTenantsResponse] =
        logger.debug(s"Getting tenants")

        val tenants = try {
            adminClient.tenants.getTenants.asScala
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(pb.GetTenantsResponse(status = Some(status)))
        }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.GetTenantsResponse(status = Some(status), tenants = tenants.toSeq))
