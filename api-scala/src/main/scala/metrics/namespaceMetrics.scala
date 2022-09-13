package metrics

import com.tools.teal.pulsar.ui.metrics.v1.metrics as pb

def getOptionalNamespaceMetrics(metricsEntries: MetricsEntries, namespace: String): pb.OptionalNamespaceMetrics =
    findMetricsEntryByDimensions(Map("namespace" -> namespace), metricsEntries) match
        case Some(metricsEntry) =>
            val m = metricsEntry.metrics
            val namespaceMetrics = pb.NamespaceMetrics(
              brkInRate = m.getOrElse("brk_in_rate", 0),
              brkInTpRate = m.getOrElse("brk_in_tp_rate", 0),
              brkMaxReplicationDelaySecond = m.getOrElse("brk_max_replication_delay_second", 0),
              brkMsgBacklog = m.getOrElse("brk_msg_backlog", 0),
              brkNoOfConsumers = m.getOrElse("brk_no_of_consumers", 0),
              brkNoOfProducers = m.getOrElse("brk_no_of_producers", 0),
              brkNoOfReplicators = m.getOrElse("brk_no_of_replicators", 0),
              brkNoOfSubscriptions = m.getOrElse("brk_no_of_subscriptions", 0),
              brkOutRate = m.getOrElse("brk_out_rate", 0),
              brkOutTpRate = m.getOrElse("brk_out_tp_rate", 0),
              brkReplicationBacklog = m.getOrElse("brk_replication_backlog", 0),
              brkStorageSize = m.getOrElse("brk_storage_size", 0),
              brkAddEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_AddEntryLatencyBuckets_")
            )
            pb.OptionalNamespaceMetrics(metrics = Some(namespaceMetrics))
        case None => pb.OptionalNamespaceMetrics(metrics = None)

def getOptionalNamespacePersistentMetrics(metricsEntries: MetricsEntries, namespace: String): pb.OptionalNamespacePersistentMetrics =
    findMetricsEntryByDimensions(Map("namespace" -> s"${namespace}/persistent"), metricsEntries) match
        case Some(metricsEntry) =>
            val m = metricsEntry.metrics
            val namespaceMetrics = pb.NamespacePersistentMetrics(
                brkMlAddEntryBytesRate = m.getOrElse("brk_ml_AddEntryBytesRate", 0),
                brkMlAddEntryErrors = m.getOrElse("brk_ml_AddEntryErrors", 0),
                brkAddEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_ml_AddEntryLatencyBuckets_"),
                brkMlAddEntryMessagesRate = m.getOrElse("brk_ml_AddEntryMessagesRate", 0),
                brkMlAddEntrySucceed = m.getOrElse("brk_ml_AddEntrySucceed", 0),
                brkMlAddEntryWithReplicasBytesRate = m.getOrElse("brk_ml_AddEntryWithReplicasBytesRate", 0),
                brkMlEntrySizeBuckets = groupMetricsByPrefix(m, "brk_ml_EntrySizeBuckets_"),
                brkMlLedgerAddEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_ml_LedgerAddEntryLatencyBuckets_"),
                brkMlLedgerSwitchLatencyBuckets = groupMetricsByPrefix(m, "brk_ml_LedgerSwitchLatencyBuckets_"),
                brkMlMarkDeleteRate = m.getOrElse("brk_ml_MarkDeleteRate", 0),
                brkMlNumberOfMessagesInBacklog = m.getOrElse("brk_ml_NumberOfMessagesInBacklog", 0),
                brkMlReadEntriesBytesRate = m.getOrElse("brk_ml_ReadEntriesBytesRate", 0),
                brkMlReadEntriesErrors = m.getOrElse("brk_ml_ReadEntriesErrors", 0),
                brkMlReadEntriesRate = m.getOrElse("brk_ml_ReadEntriesRate", 0),
                brkMlReadEntriesSucceeded = m.getOrElse("brk_ml_ReadEntriesSucceeded", 0),
                brkMlStoredMessagesSize = m.getOrElse("brk_ml_StoredMessagesSize", 0)
            )
            pb.OptionalNamespacePersistentMetrics(metrics = Some(namespaceMetrics))
        case None => pb.OptionalNamespacePersistentMetrics(metrics = None)
