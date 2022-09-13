package metrics

import com.tools.teal.pulsar.ui.metrics.v1.metrics as pb

def getOptionalNamespaceMetrics(metricsEntries: MetricsEntries, namespace: String): pb.OptionalNamespaceMetrics =
    findMetricsEntryByDimensions(Map("namespace" -> namespace), metricsEntries) match
        case Some(metricsEntry) =>
            val m = metricsEntry.metrics
            val namespaceMetrics = pb.NamespaceMetrics(
              inRate = m.getOrElse("brk_in_rate", 0),
              inTpRate = m.getOrElse("brk_in_tp_rate", 0),
              maxReplicationDelaySecond = m.getOrElse("brk_max_replication_delay_second", 0),
              msgBacklog = m.getOrElse("brk_msg_backlog", 0),
              noOfConsumers = m.getOrElse("brk_no_of_consumers", 0),
              noOfProducers = m.getOrElse("brk_no_of_producers", 0),
              noOfReplicators = m.getOrElse("brk_no_of_replicators", 0),
              noOfSubscriptions = m.getOrElse("brk_no_of_subscriptions", 0),
              outRate = m.getOrElse("brk_out_rate", 0),
              outTpRate = m.getOrElse("brk_out_tp_rate", 0),
              replicationBacklog = m.getOrElse("brk_replication_backlog", 0),
              storageSize = m.getOrElse("brk_storage_size", 0),
              addEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_AddEntryLatencyBuckets_")
            )
            pb.OptionalNamespaceMetrics(metrics = Some(namespaceMetrics))
        case None => pb.OptionalNamespaceMetrics(metrics = None)

def getOptionalNamespacePersistentMetrics(metricsEntries: MetricsEntries, namespace: String): pb.OptionalNamespacePersistentMetrics =
    findMetricsEntryByDimensions(Map("namespace" -> s"${namespace}/persistent"), metricsEntries) match
        case Some(metricsEntry) =>
            val m = metricsEntry.metrics
            val namespaceMetrics = pb.NamespacePersistentMetrics(
                addEntryBytesRate = m.getOrElse("brk_ml_AddEntryBytesRate", 0),
                addEntryErrors = m.getOrElse("brk_ml_AddEntryErrors", 0),
                addEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_ml_AddEntryLatencyBuckets_"),
                addEntryMessagesRate = m.getOrElse("brk_ml_AddEntryMessagesRate", 0),
                addEntrySucceed = m.getOrElse("brk_ml_AddEntrySucceed", 0),
                addEntryWithReplicasBytesRate = m.getOrElse("brk_ml_AddEntryWithReplicasBytesRate", 0),
                entrySizeBuckets = groupMetricsByPrefix(m, "brk_ml_EntrySizeBuckets_"),
                ledgerAddEntryLatencyBuckets = groupMetricsByPrefix(m, "brk_ml_LedgerAddEntryLatencyBuckets_"),
                ledgerSwitchLatencyBuckets = groupMetricsByPrefix(m, "brk_ml_LedgerSwitchLatencyBuckets_"),
                markDeleteRate = m.getOrElse("brk_ml_MarkDeleteRate", 0),
                numberOfMessagesInBacklog = m.getOrElse("brk_ml_NumberOfMessagesInBacklog", 0),
                readEntriesBytesRate = m.getOrElse("brk_ml_ReadEntriesBytesRate", 0),
                readEntriesErrors = m.getOrElse("brk_ml_ReadEntriesErrors", 0),
                readEntriesRate = m.getOrElse("brk_ml_ReadEntriesRate", 0),
                readEntriesSucceeded = m.getOrElse("brk_ml_ReadEntriesSucceeded", 0),
                storedMessagesSize = m.getOrElse("brk_ml_StoredMessagesSize", 0)
            )
            pb.OptionalNamespacePersistentMetrics(metrics = Some(namespaceMetrics))
        case None => pb.OptionalNamespacePersistentMetrics(metrics = None)
