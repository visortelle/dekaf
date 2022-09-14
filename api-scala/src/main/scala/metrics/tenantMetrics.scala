package metrics

import _root_.client.{adminClient, client}
import com.tools.teal.pulsar.ui.metrics.v1.metrics as pb
import com.typesafe.scalalogging.Logger

val logger: Logger = Logger(getClass.getName)

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
