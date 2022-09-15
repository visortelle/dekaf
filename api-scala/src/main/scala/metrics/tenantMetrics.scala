package metrics

import _root_.client.{adminClient, client}
import com.tools.teal.pulsar.ui.metrics.v1.metrics as pb
import com.typesafe.scalalogging.Logger

val logger: Logger = Logger(getClass.getName)

case class TenantMetrics(
    inRate: Double,
    inTpRate: Double,
    maxReplicationDelaySecond: Double,
    msgBacklog: Double,
    noOfConsumers: Double,
    noOfProducers: Double,
    noOfReplicators: Double,
    noOfSubscriptions: Double,
    outRate: Double,
    outTpRate: Double,
    replicationBacklog: Double,
    storageSize: Double,
    addEntryLatencyBuckets: Map[MetricKey, MetricValue]
)

//def getTenantMetrics(metricsEntries: MetricsEntries, tenant: String): Option[TenantMetrics] =
//    findMetricsEntryByDimensions(Map("namespace" -> namespace), metricsEntries) match
//        case Some(metricsEntry) =>
//            val m = metricsEntry.metrics
//            val namespaceMetrics = NamespaceMetrics(
//                inRate = m.getOrElse("brk_in_rate", 0),
//                inTpRate = m.getOrElse("brk_in_tp_rate", 0),
//                maxReplicationDelaySecond = m.getOrElse("brk_max_replication_delay_second", 0),
//                msgBacklog = m.getOrElse("brk_msg_backlog", 0),
//                noOfConsumers = m.getOrElse("brk_no_of_consumers", 0),
//                noOfProducers = m.getOrElse("brk_no_of_producers", 0),
//                noOfReplicators = m.getOrElse("brk_no_of_replicators", 0),
//                noOfSubscriptions = m.getOrElse("brk_no_of_subscriptions", 0),
//                outRate = m.getOrElse("brk_out_rate", 0),
//                outTpRate = m.getOrElse("brk_out_tp_rate", 0),
//                replicationBacklog = m.getOrElse("brk_replication_backlog", 0),
//                storageSize = m.getOrElse("brk_storage_size", 0),
//                addEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_AddEntryLatencyBuckets_")
//            )
//            Some(namespaceMetrics)
//        case None => None

//def getOptionalTenantMetrics(metricsEntries: MetricsEntries, tenant: String): pb.OptionalTenantMetrics =
//    val tenantNamespaces = try {
//        adminClient.namespaces.getNamespaces(tenant)
//    } catch {
//        case err =>
//            return pb.OptionalTenantMetrics(metrics = None)
//    }
//
//    findMetricsEntryByDimensions(Map("namespace" -> namespace), metricsEntries) match
//        case Some(metricsEntry) =>
//            val m = metricsEntry.metrics
//            val namespaceMetrics = pb.TenantMetrics(
//                inRate = m.getOrElse("brk_in_rate", 0),
//                inTpRate = m.getOrElse("brk_in_tp_rate", 0),
//                maxReplicationDelaySecond = m.getOrElse("brk_max_replication_delay_second", 0),
//                msgBacklog = m.getOrElse("brk_msg_backlog", 0),
//                noOfConsumers = m.getOrElse("brk_no_of_consumers", 0),
//                noOfProducers = m.getOrElse("brk_no_of_producers", 0),
//                noOfReplicators = m.getOrElse("brk_no_of_replicators", 0),
//                noOfSubscriptions = m.getOrElse("brk_no_of_subscriptions", 0),
//                outRate = m.getOrElse("brk_out_rate", 0),
//                outTpRate = m.getOrElse("brk_out_tp_rate", 0),
//                replicationBacklog = m.getOrElse("brk_replication_backlog", 0),
//                storageSize = m.getOrElse("brk_storage_size", 0),
//                addEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_AddEntryLatencyBuckets_")
//            )
//            pb.OptionalTenantMetrics(metrics = Some(namespaceMetrics))
//        case None => pb.OptionalTenantMetrics(metrics = None)
