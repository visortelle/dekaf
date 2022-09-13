import * as metricsPb from "../../../grpc-web/tools/teal/pulsar/ui/metrics/v1/metrics_pb";

export type NamespaceMetrics = {
  inRate: number;
  inTpRate: number;
  maxReplicationDelaySecond: number;
  msgBacklog: number;
  noOfConsumers: number;
  noOfProducers: number;
  noOfReplicators: number;
  noOfSubscriptions: number;
  outRate: number;
  outTpRate: number;
  replicationBacklog: number;
  storageSize: number;
  addEntryLatencyBuckets: Record<string, number>;
};

export function namespaceMetricsFromPb(
  metricsPb: metricsPb.NamespaceMetrics
): NamespaceMetrics {
  return {
    inRate: metricsPb.getInRate(),
    inTpRate: metricsPb.getInTpRate(),
    maxReplicationDelaySecond: metricsPb.getMaxReplicationDelaySecond(),
    msgBacklog: metricsPb.getMsgBacklog(),
    noOfConsumers: metricsPb.getNoOfConsumers(),
    noOfProducers: metricsPb.getNoOfProducers(),
    noOfReplicators: metricsPb.getNoOfReplicators(),
    noOfSubscriptions: metricsPb.getNoOfSubscriptions(),
    outRate: metricsPb.getOutRate(),
    outTpRate: metricsPb.getOutTpRate(),
    replicationBacklog: metricsPb.getReplicationBacklog(),
    storageSize: metricsPb.getStorageSize(),
    addEntryLatencyBuckets: Object.fromEntries(
      metricsPb.getAddEntryLatencyBucketsMap().toObject()
    ),
  };
}

export function metricsFromPb(
  res: metricsPb.GetNamespacesMetricsResponse
): Record<string, NamespaceMetrics | undefined> {
  let namespacesMetrics: Record<string, NamespaceMetrics> = {};
  res.getNamespacesMetricsMap().forEach((nsMetrics, ns) => {
    const metrics = nsMetrics.getMetrics();
    if (metrics === undefined) {
      return undefined;
    }

    namespacesMetrics[ns] = namespaceMetricsFromPb(metrics);
  });
  return namespacesMetrics;
}
