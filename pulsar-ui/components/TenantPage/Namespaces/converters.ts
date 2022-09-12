import * as metricsPb from "../../../grpc-web/tools/teal/pulsar/ui/metrics/v1/metrics_pb";

export type NamespaceMetrics = {
  brkAddEntryLatencyBucketsOverflow: number;
  bkrInRate: number;
  brkInTpRate: number;
  brkMaxReplicationDelaySecond: number;
  brkMsgBacklog: number;
  brkNoOfConsumers: number;
  brkNoOfProducers: number;
  brkNoOfReplicators: number;
  brkNoOfSubscriptions: number;
  brkOutRate: number;
  brkOutTpRate: number;
  brkReplicationBacklog: number;
  brkStorageSize: number;
}

export function namespaceMetricsFromPb(namespaceMetricsPb: metricsPb.NamespaceMetrics): NamespaceMetrics {
  return {
    brkAddEntryLatencyBucketsOverflow: namespaceMetricsPb.getBrkAddEntryLatencyBucketsOverflow(),
    bkrInRate: namespaceMetricsPb.getBrkInRate(),
    brkInTpRate: namespaceMetricsPb.getBrkInTpRate(),
    brkMaxReplicationDelaySecond: namespaceMetricsPb.getBrkMaxReplicationDelaySecond(),
    brkMsgBacklog: namespaceMetricsPb.getBrkMsgBacklog(),
    brkNoOfConsumers: namespaceMetricsPb.getBrkNoOfConsumers(),
    brkNoOfProducers: namespaceMetricsPb.getBrkNoOfProducers(),
    brkNoOfReplicators: namespaceMetricsPb.getBrkNoOfReplicators(),
    brkNoOfSubscriptions: namespaceMetricsPb.getBrkNoOfSubscriptions(),
    brkOutRate: namespaceMetricsPb.getBrkOutRate(),
    brkOutTpRate: namespaceMetricsPb.getBrkOutTpRate(),
    brkReplicationBacklog: namespaceMetricsPb.getBrkReplicationBacklog(),
    brkStorageSize: namespaceMetricsPb.getBrkStorageSize(),
  }
}

export function namespacesMetricsFromPb(res: metricsPb.GetNamespacesMetricsResponse): Record<string, NamespaceMetrics> {
  let namespacesMetrics: Record<string, NamespaceMetrics> = {};
  res.getNamespacesMetricsMap().forEach((nsMetrics, ns) => {
    namespacesMetrics[ns] = namespaceMetricsFromPb(nsMetrics);
  });
  return namespacesMetrics;
}
