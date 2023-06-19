package tenant

import com.tools.teal.pulsar.ui.tenant.v1.tenant as pb
import com.typesafe.scalalogging.Logger
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import org.apache.pulsar.common.policies.data.TenantInfo
import pulsar_auth.RequestContext

import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import scala.concurrent.{Await, ExecutionContext, Future}
import java.util.concurrent.{CompletableFuture, TimeUnit}
import scala.concurrent.duration.Duration

class TenantServiceImpl extends pb.TenantServiceGrpc.TenantService:
    val logger: Logger = Logger(getClass.getName)

    override def createTenant(request: pb.CreateTenantRequest): Future[pb.CreateTenantResponse] =
        logger.info(s"Creating tenant: ${request.tenantName}")
        val adminClient = RequestContext.pulsarAdmin.get()

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
        val adminClient = RequestContext.pulsarAdmin.get()

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
        val adminClient = RequestContext.pulsarAdmin.get()

        try {
            adminClient.tenants.deleteTenant(request.tenantName, request.force)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(pb.DeleteTenantResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(pb.DeleteTenantResponse(status = Some(status)))
        }

    override def getTenants(request: pb.GetTenantsRequest): Future[pb.GetTenantsResponse] =
        logger.debug(s"Getting tenants: ${request}")
        val adminClient = RequestContext.pulsarAdmin.get()

        def tenantInfoToPb(tenantInfo: TenantInfo): pb.TenantInfo = pb.TenantInfo(
            adminRoles = tenantInfo.getAdminRoles.asScala.toSeq,
            allowedClusters = tenantInfo.getAllowedClusters.asScala.toSeq
        )

        given ExecutionContext = ExecutionContext.global

        // TODO PERF - run both sets of futures (tenants and namespacesCount) in parallel.
        val tenants = try {
            val getTenantsFutures = request.tenants.map(t => adminClient.tenants.getTenantInfoAsync(t).asScala)
            val tenantsInfo = Await.result(Future.sequence(getTenantsFutures), Duration(1, TimeUnit.MINUTES))
                .map(tenantInfoToPb)
            request.tenants.zip(tenantsInfo).toMap
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(pb.GetTenantsResponse(status = Some(status)))
        }

        val namespacesCount = try {
            if request.isGetNamespacesCount then
                val getNamespacesCountFutures = request.tenants.map(t => adminClient.namespaces.getNamespacesAsync(t).asScala)
                val namespacesCount = Await.result(Future.sequence(getNamespacesCountFutures), Duration(1, TimeUnit.MINUTES))
                    .map(_.size)
                request.tenants.zip(namespacesCount).toMap
            else
                Map.empty
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(pb.GetTenantsResponse(status = Some(status)))
        }


        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.GetTenantsResponse(
            status = Some(status),
            tenants,
            namespacesCount
        ))

    override def listTenants(request: pb.ListTenantsRequest): Future[pb.ListTenantsResponse] =
        logger.debug(s"Listing tenants")
        val adminClient = RequestContext.pulsarAdmin.get()

        val tenants = try {
            adminClient.tenants.getTenants.asScala
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(pb.ListTenantsResponse(status = Some(status)))
        }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(pb.ListTenantsResponse(status = Some(status), tenants = tenants.toSeq))
