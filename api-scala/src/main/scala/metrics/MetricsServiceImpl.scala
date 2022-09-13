package metrics

import com.tools.teal.pulsar.ui.metrics.v1.metrics as metricsPb
import com.tools.teal.pulsar.ui.metrics.v1.metrics.{GetNamespacesMetricsRequest, GetNamespacesMetricsResponse, GetTenantsMetricsRequest, GetTenantsMetricsResponse, MetricsServiceGrpc, NamespaceMetrics, TenantMetrics}
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
    var metricsJson: String = "[]"
    var eitherMetricsOrErr: Either[circe.Error, MetricsEntries] = Right(List.empty)

    // Periodically re-fetch metrics
    val updateMetricsTimer = new java.util.Timer()
    val updateMetricsTimerTask = new TimerTask:
        override def run(): Unit =
            metricsJson = adminClient.brokerStats().getMetrics
                .replaceAll("\"NaN\"", "0") // It's a dirty hack. TODO - Write a proper decoder.
            eitherMetricsOrErr = decodeJson[MetricsEntries](metricsJson)
    updateMetricsTimer.scheduleAtFixedRate(updateMetricsTimerTask, 0, 10000L)

    override def getNamespacesMetrics(request: GetNamespacesMetricsRequest): Future[GetNamespacesMetricsResponse] =
        try {
            eitherMetricsOrErr match
                case Right(metrics) =>
                    val optionalNamespacesMetrics = request.namespaces.map(namespace =>
                        (namespace, getOptionalNamespaceMetrics(metrics, namespace))
                    ).toMap

                    val optionalNamespacesPersistentMetrics = request.namespaces.map(namespace =>
                        (namespace, getOptionalNamespacePersistentMetrics(metrics, namespace))
                    ).toMap

                    val status: Status = Status(code = Code.OK.index)
                    Future.successful(GetNamespacesMetricsResponse(
                        status = Some(status),
                        namespacesMetrics = optionalNamespacesMetrics
                    ))
                case Left(err) =>
                    val status: Status = Status(
                        code = Code.FAILED_PRECONDITION.index,
                        message = s"Metrics decoding failure. ${err.getMessage}"
                    )
                    Future.successful(GetNamespacesMetricsResponse(status = Some(status)))
        } catch {
            case err =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(GetNamespacesMetricsResponse(status = Some(status)))
        }

    override def getTenantsMetrics(request: GetTenantsMetricsRequest): Future[GetTenantsMetricsResponse] = ???
