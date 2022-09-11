package metrics

case class TenantMetrics(
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
