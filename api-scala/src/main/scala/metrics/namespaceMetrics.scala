package metrics

import com.tools.teal.pulsar.ui.metrics.v1.metrics as metricsPb

case class NamespaceMetrics(
    brkAddEntryLatencyBucketsOverflow: Double,
    brkInRate: Double,
    brkInTpRate: Double,
    brkMaxReplicationDelaySecond: Double,
    brkMsgBacklog: Double,
    brkNoOfConsumers: Double,
    brkNoOfProducers: Double,
    brkNoOfReplicators: Double,
    brkNoOfSubscriptions: Double,
    brkOutRate: Double,
    brkOutTpRate: Double,
    brkReplicationBacklog: Double,
    brkStorageSize: Double
)

def namespaceMetricsToPb(nm: NamespaceMetrics): metricsPb.NamespaceMetrics =
    metricsPb.NamespaceMetrics(
      brkAddEntryLatencyBucketsOverflow = nm.brkAddEntryLatencyBucketsOverflow,
      brkInRate = nm.brkInRate,
      brkInTpRate = nm.brkInTpRate,
      brkMaxReplicationDelaySecond = nm.brkMaxReplicationDelaySecond,
      brkMsgBacklog = nm.brkMsgBacklog,
      brkNoOfConsumers = nm.brkNoOfConsumers,
      brkNoOfProducers = nm.brkNoOfProducers,
      brkNoOfReplicators = nm.brkNoOfReplicators,
      brkNoOfSubscriptions = nm.brkNoOfSubscriptions,
      brkOutRate = nm.brkOutRate,
      brkOutTpRate = nm.brkOutTpRate,
      brkReplicationBacklog = nm.brkReplicationBacklog,
      brkStorageSize = nm.brkStorageSize
    )

def findNamespaceMetrics(metricsEntries: MetricsEntries, namespace: String): Option[NamespaceMetrics] =
    val dimensions: Dimensions = Map("namespace" -> namespace)
    findMetricsEntryByDimensions(dimensions, metricsEntries) match
        case Some(me) =>
            val namespaceMetrics = NamespaceMetrics(
              brkAddEntryLatencyBucketsOverflow = me.metrics.getOrElse("brk_AddEntryLatencyBuckets_OVERFLOW", 0),
              brkInRate = me.metrics.getOrElse("brk_in_rate", 0),
              brkInTpRate = me.metrics.getOrElse("brk_in_tp_rate", 0),
              brkMaxReplicationDelaySecond = me.metrics.getOrElse("brk_max_replication_delay_second", 0),
              brkMsgBacklog = me.metrics.getOrElse("brk_msg_backlog", 0),
              brkNoOfConsumers = me.metrics.getOrElse("brk_no_of_consumers", 0),
              brkNoOfProducers = me.metrics.getOrElse("brk_no_of_producers", 0),
              brkNoOfReplicators = me.metrics.getOrElse("brk_no_of_replicators", 0),
              brkNoOfSubscriptions = me.metrics.getOrElse("brk_no_of_subscriptions", 0),
              brkOutRate = me.metrics.getOrElse("brk_out_rate", 0),
              brkOutTpRate = me.metrics.getOrElse("brk_out_tp_rate", 0),
              brkReplicationBacklog = me.metrics.getOrElse("brk_replication_backlog", 0),
              brkStorageSize = me.metrics.getOrElse("brk_storage_size", 0)
            )
            Some(namespaceMetrics)
        case None => None
