package clusters

import _root_.client.adminClient
import com.tools.teal.pulsar.ui.clusters.v1.clusters as clusterPb
import com.tools.teal.pulsar.ui.clusters.v1.clusters.{ClustersServiceGrpc, ListClustersRequest, ListClustersResponse}
import com.google.rpc.status.Status
import com.google.rpc.code.Code

import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class ClustersServiceImpl extends  ClustersServiceGrpc.ClustersService {
    override def listClusters(request: ListClustersRequest): Future[ListClustersResponse] =
        try {
            val clusters = adminClient.clusters.getClusters
            val status: Status = Status(code = Code.OK.index)
            Future.successful(ListClustersResponse(status = Some(status), clusters = clusters.asScala.toList))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(ListClustersResponse(status = Some(status)))
        }
}
