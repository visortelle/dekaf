package clusters

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.clusters.v1.clusters as pb
import com.tools.teal.pulsar.ui.clusters.v1.clusters.{
    ClustersServiceGrpc,
    CreateClusterRequest,
    CreateClusterResponse,
    CreateFailureDomainRequest,
    CreateFailureDomainResponse,
    CreateNamespaceIsolationPolicyRequest,
    CreateNamespaceIsolationPolicyResponse,
    DeleteClusterRequest,
    DeleteClusterResponse,
    DeleteFailureDomainRequest,
    DeleteFailureDomainResponse,
    DeleteNamespaceIsolationPolicyRequest,
    DeleteNamespaceIsolationPolicyResponse,
    GetBrokersWithNamespaceIsolationPolicyRequest,
    GetBrokersWithNamespaceIsolationPolicyResponse,
    GetClusterRequest,
    GetClusterResponse,
    GetClustersRequest,
    GetClustersResponse,
    GetFailureDomainsRequest,
    GetFailureDomainsResponse,
    GetNamespaceIsolationPolicyRequest,
    GetNamespaceIsolationPolicyResponse,
    UpdateFailureDomainRequest,
    UpdateFailureDomainResponse,
    UpdateNamespaceIsolationPolicyRequest,
    UpdateNamespaceIsolationPolicyResponse
}
import com.google.rpc.status.Status
import com.google.rpc.code.Code

import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class ClustersServiceImpl extends ClustersServiceGrpc.ClustersService:
    override def getClusters(request: GetClustersRequest): Future[GetClustersResponse] =
        try
            val clusters = adminClient.clusters.getClusters
            val status: Status = Status(code = Code.OK.index)
            Future.successful(GetClustersResponse(status = Some(status), clusters = clusters.asScala.toList))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(GetClustersResponse(status = Some(status)))

    override def getCluster(request: GetClusterRequest): Future[GetClusterResponse] =
        val clusterData =
            try adminClient.clusters.getCluster(request.cluster)
            catch
                case err =>
                    val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                    return Future.successful(GetClusterResponse(status = Some(status)))

        val clusterDataPb = conversions.clusterDataToPb(clusterData)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(GetClusterResponse(status = Some(status), clusterData = Some(clusterDataPb)))

    override def createCluster(request: CreateClusterRequest): Future[CreateClusterResponse] =
        try
            val clusterData = request.clusterData match
                case None =>
                    val status = Status(code = Code.FAILED_PRECONDITION.index, message = "Cluster data is empty")
                    return Future.successful(CreateClusterResponse(status = Some(status)))
                case Some(cd) => conversions.clusterDataFromPb(cd)

            adminClient.clusters.createCluster(request.cluster, clusterData)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreateClusterResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateClusterResponse(status = Some(status)))

    override def deleteCluster(request: DeleteClusterRequest): Future[DeleteClusterResponse] =
        try
            adminClient.clusters.deleteCluster(request.cluster)

            val status: Status = Status(code = Code.OK.index)
            Future.successful(DeleteClusterResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteClusterResponse(status = Some(status)))

    override def getFailureDomains(request: GetFailureDomainsRequest): Future[GetFailureDomainsResponse] =
        try
            val failureDomains = adminClient.clusters.getFailureDomains(request.cluster)
            val failureDomainsPb = failureDomains.asScala.view.mapValues(conversions.failureDomainToPb).toMap
            val status: Status = Status(code = Code.OK.index)
            Future.successful(GetFailureDomainsResponse(status = Some(status), domains = failureDomainsPb))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetFailureDomainsResponse(status = Some(status)))

    override def createFailureDomain(request: CreateFailureDomainRequest): Future[CreateFailureDomainResponse] =
        try
            val failureDomain = conversions.failureDomainFromPb(
                request.domain.getOrElse(throw new IllegalArgumentException("Failure domain should be specified"))
            )

            adminClient.clusters.createFailureDomain(
                request.cluster,
                request.domainName,
                failureDomain
            )
            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreateFailureDomainResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateFailureDomainResponse(status = Some(status)))

    override def deleteFailureDomain(request: DeleteFailureDomainRequest): Future[DeleteFailureDomainResponse] =
        try
            adminClient.clusters.deleteFailureDomain(request.cluster, request.domainName)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(DeleteFailureDomainResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteFailureDomainResponse(status = Some(status)))

    override def updateFailureDomain(request: UpdateFailureDomainRequest): Future[UpdateFailureDomainResponse] =
        try
            val failureDomain = conversions.failureDomainFromPb(
                request.domain.getOrElse(throw new IllegalArgumentException("Failure domain should be specified"))
            )
            adminClient.clusters.updateFailureDomain(
                request.cluster,
                request.domainName,
                failureDomain
            )
            val status: Status = Status(code = Code.OK.index)
            Future.successful(UpdateFailureDomainResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateFailureDomainResponse(status = Some(status)))

    override def createNamespaceIsolationPolicy(request: CreateNamespaceIsolationPolicyRequest): Future[CreateNamespaceIsolationPolicyResponse] =
        try
            val policy = conversions.namespaceIsolationDataFromPb(
                request.namespaceIsolationData.getOrElse(throw new IllegalArgumentException("Namespace isolation data should be specified"))
            )
            adminClient.clusters.createNamespaceIsolationPolicy(
                request.cluster,
                request.policyName,
                policy
            )
            val status: Status = Status(code = Code.OK.index)
            Future.successful(CreateNamespaceIsolationPolicyResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateNamespaceIsolationPolicyResponse(status = Some(status)))

    override def deleteNamespaceIsolationPolicy(request: DeleteNamespaceIsolationPolicyRequest): Future[DeleteNamespaceIsolationPolicyResponse] =
        try
            adminClient.clusters.deleteNamespaceIsolationPolicy(request.cluster, request.policyName)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(DeleteNamespaceIsolationPolicyResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(DeleteNamespaceIsolationPolicyResponse(status = Some(status)))

    override def getNamespaceIsolationPolicy(request: GetNamespaceIsolationPolicyRequest): Future[GetNamespaceIsolationPolicyResponse] =
        try
            val policy = adminClient.clusters.getNamespaceIsolationPolicy(request.cluster, request.policyName)
            val namespaceIsolationDataPb = conversions.namespaceIsolationDataToPb(policy)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(GetNamespaceIsolationPolicyResponse(status = Some(status), namespaceIsolationData = Some(namespaceIsolationDataPb)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetNamespaceIsolationPolicyResponse(status = Some(status)))

    override def updateNamespaceIsolationPolicy(request: UpdateNamespaceIsolationPolicyRequest): Future[UpdateNamespaceIsolationPolicyResponse] =
        try
            val policy = conversions.namespaceIsolationDataFromPb(
                request.namespaceIsolationData.getOrElse(throw new IllegalArgumentException("Namespace isolation data should be specified"))
            )
            adminClient.clusters.updateNamespaceIsolationPolicy(
                request.cluster,
                request.policyName,
                policy
            )
            val status: Status = Status(code = Code.OK.index)
            Future.successful(UpdateNamespaceIsolationPolicyResponse(status = Some(status)))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(UpdateNamespaceIsolationPolicyResponse(status = Some(status)))

    override def getBrokersWithNamespaceIsolationPolicy(
        request: GetBrokersWithNamespaceIsolationPolicyRequest
    ): Future[GetBrokersWithNamespaceIsolationPolicyResponse] =
        try
            val brokers = adminClient.clusters.getBrokersWithNamespaceIsolationPolicy(request.cluster)
            val brokersPb = brokers.asScala.toList.map(conversions.brokerNamespaceIsolationDataToPb)
            val status: Status = Status(code = Code.OK.index)
            Future.successful(GetBrokersWithNamespaceIsolationPolicyResponse(status = Some(status), brokers = brokersPb))
        catch
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetBrokersWithNamespaceIsolationPolicyResponse(status = Some(status)))
