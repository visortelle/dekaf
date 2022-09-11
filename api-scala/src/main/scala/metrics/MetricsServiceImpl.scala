package metrics

import com.tools.teal.pulsar.ui.metrics.v1.metrics as metricsPb
import com.tools.teal.pulsar.ui.metrics.v1.metrics.{
    GetNamespacesMetricsRequest,
    GetNamespacesMetricsResponse,
    GetTenantsMetricsRequest,
    GetTenantsMetricsResponse,
    MetricsServiceGrpc,
    NamespaceMetrics,
    TenantMetrics
}
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import io.circe.parser.decode as decodeJson

class MetricsServiceImpl extends MetricsServiceGrpc.MetricsService:
    override def getNamespacesMetrics(request: GetNamespacesMetricsRequest): Future[GetNamespacesMetricsResponse] =
        try {
            val metricsJson = adminClient.brokerStats().getMetrics
            val eitherMetricsOrErr = decodeJson[MetricsEntries](metricsJson)
            eitherMetricsOrErr match
                case Right(metrics) =>
                    val namespacesMetrics = request.namespaces.flatMap(ns =>
                        findNamespaceMetrics(metrics, ns) match
                            case Some(nm) => Some((ns, namespaceMetricsToPb(nm)))
                            case None => None
                    ).toMap
                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(GetNamespacesMetricsResponse(
                        status = Some(status),
                        namespacesMetrics = namespacesMetrics
                    ))
                case Left(err) =>
                    val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                    Future.successful(GetNamespacesMetricsResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetNamespacesMetricsResponse(status = Some(status)))
        }

    override def getTenantsMetrics(request: GetTenantsMetricsRequest): Future[GetTenantsMetricsResponse] = ???
