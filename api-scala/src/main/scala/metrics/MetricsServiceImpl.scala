package metrics

import com.tools.teal.pulsar.ui.metrics.v1.metrics as metricsPb
import com.tools.teal.pulsar.ui.metrics.v1.metrics.{GetNamespacesMetricsRequest, GetNamespacesMetricsResponse, GetNamespacesPersistentMetricsRequest, GetNamespacesPersistentMetricsResponse, GetTenantsMetricsRequest, GetTenantsMetricsResponse, GetTenantsPersistentMetricsRequest, GetTenantsPersistentMetricsResponse, MetricsServiceGrpc, NamespaceMetrics, TenantMetrics}
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import io.circe
import io.circe.parser.decode as decodeJson

import java.util.TimerTask
import java.util.concurrent.*

class MetricsServiceImpl extends MetricsServiceGrpc.MetricsService:
    val logger: Logger = Logger(getClass.getName)
    var metricsJson: String = "[]"
    var metricsEntries: MetricsEntries = List.empty

    // Periodically re-fetch metrics
    val updateMetricsTimer = new java.util.Timer()
    val updateMetricsTimerTask: TimerTask = new TimerTask:
        override def run(): Unit =
            metricsJson = adminClient.brokerStats().getMetrics
                .replaceAll("\"NaN\"", "0") // It's a dirty hack. TODO - Write a proper decoder.
//            println(s"METRICS JSON DEBUG ${metricsJson}")
            decodeJson[MetricsEntries](metricsJson) match
                case Right(v) => metricsEntries = v
                case Left(err) => logger.error(s"Unable to decode metrics ${err.getMessage}")
    updateMetricsTimer.scheduleAtFixedRate(updateMetricsTimerTask, 0, 10000L)

    override def getNamespacesMetrics(request: GetNamespacesMetricsRequest): Future[GetNamespacesMetricsResponse] =
        try {
            val optionalNamespacesMetrics = request.namespaces.map(namespace =>
                (namespace, getOptionalNamespaceMetricsPb(metricsEntries, namespace))
            ).toMap

            val status: Status = Status(code = Code.OK.index)
            Future.successful(GetNamespacesMetricsResponse(
                status = Some(status),
                namespacesMetrics = optionalNamespacesMetrics
            ))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetNamespacesMetricsResponse(status = Some(status)))
        }

    override def getNamespacesPersistentMetrics(request: GetNamespacesPersistentMetricsRequest): Future[GetNamespacesPersistentMetricsResponse] =
        try {
            val optionalNamespacesPersistentMetrics = request.namespaces.map(namespace =>
                (namespace, getOptionalNamespacePersistentMetricsPb(metricsEntries, namespace))
            ).toMap

            val status: Status = Status(code = Code.OK.index)
            Future.successful(GetNamespacesPersistentMetricsResponse(
                status = Some(status),
                namespacesPersistentMetrics = optionalNamespacesPersistentMetrics
            ))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetNamespacesPersistentMetricsResponse(status = Some(status)))
        }


    override def getTenantsMetrics(request: GetTenantsMetricsRequest): Future[GetTenantsMetricsResponse] = ???
//        try {
//            val optionalNamespacesMetrics = request.tenants.map(namespace =>
//                (namespace, getOptionalTenMetricsPb(metricsEntries, namespace))
//            ).toMap
//
//            val status: Status = Status(code = Code.OK.index)
//            Future.successful(GetTenantsMetricsResponse(
//                status = Some(status),
//                namespacesMetrics = optionalNamespacesMetrics
//            ))
//        } catch {
//            case err =>
//                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
//                Future.successful(GetTenantsMetricsResponse(status = Some(status)))
//        }

    override def getTenantsPersistentMetrics(request: GetTenantsPersistentMetricsRequest): Future[GetTenantsPersistentMetricsResponse] = ???
