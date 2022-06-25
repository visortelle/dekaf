import type {
  TopicsMetrics,
  TopicMetrics,
  NamespaceMetrics,
  TenantMetrics,
  Addr_Tenant_Namespace,
} from "./types";
import _ from "lodash";

function sum(a: number | undefined, b: number | undefined) {
  return a === undefined ? b : a + (b || 0);
}

export function getNamespaceMetrics(
  tenant: string,
  namespace: string,
  metrics: TopicsMetrics
): NamespaceMetrics {
  const namespaceTopicsMetrics: TopicMetrics[] = _(
    metrics[`${tenant}/${namespace}`]
  )
    .toPairs()
    .map(([__, b]) => {
      return _(b)
        .toPairs()
        .map(([__, c]) => {
          return _(c)
            .toPairs()
            .map(([__, d]) => d)
            .value()
            .flat();
        })
        .value()
        .flat();
    })
    .value()
    .flat();

  const result = namespaceTopicsMetrics.reduce<NamespaceMetrics>(
    (namespaceMetrics, topicMetrics) => {
      return {
        averageMsgSize: sum(
          namespaceMetrics.averageMsgSize,
          topicMetrics.averageMsgSize
        ),
        backlogSize: sum(
          namespaceMetrics.backlogSize,
          topicMetrics.backlogSize
        ),
        bytesInCount: sum(
          namespaceMetrics.bytesInCount,
          topicMetrics.bytesInCount
        ),
        bytesOutCount: sum(
          namespaceMetrics.bytesOutCount,
          topicMetrics.bytesOutCount
        ),
        msgInCount: sum(namespaceMetrics.msgInCount, topicMetrics.msgInCount),
        msgOutCount: sum(
          namespaceMetrics.msgOutCount,
          topicMetrics.msgOutCount
        ),
        msgRateIn: sum(namespaceMetrics.msgRateIn, topicMetrics.msgRateIn),
        msgRateOut: sum(namespaceMetrics.msgRateOut, topicMetrics.msgRateOut),
        msgThroughputIn: sum(
          namespaceMetrics.msgThroughputIn,
          topicMetrics.msgThroughputIn
        ),
        msgThroughputOut: sum(
          namespaceMetrics.msgThroughputOut,
          topicMetrics.msgThroughputOut
        ),
        pendingAddEntriesCount: sum(
          namespaceMetrics.pendingAddEntriesCount,
          topicMetrics.pendingAddEntriesCount
        ),
        producerCount: sum(
          namespaceMetrics.producerCount,
          topicMetrics.producerCount
        ),
        storageSize: sum(
          namespaceMetrics.storageSize,
          topicMetrics.storageSize
        ),
      };
    },
    {}
  );

  result.averageMsgSize =
    result.averageMsgSize === undefined || namespaceTopicsMetrics.length === 0
      ? 0
      : result.averageMsgSize / namespaceTopicsMetrics.length;

  return result;
}

type NamespaceName = string;
export function getNamespacesMetrics(
  tenant: string,
  namespaces: string[],
  metrics: TopicsMetrics
): Record<NamespaceName, NamespaceMetrics> {
  const result = namespaces.reduce<Record<NamespaceName, NamespaceMetrics>>(
    (namespacesMetrics, namespace) => {
      return {
        ...namespacesMetrics,
        [namespace]: getNamespaceMetrics(tenant, namespace, metrics),
      };
    },
    {}
  );

  return result;
}

export function getTenantMetrics(
  tenant: string,
  metrics: TopicsMetrics
): TenantMetrics {
  const tenantNamespaces = Object.keys(metrics)
    .filter((key: Addr_Tenant_Namespace) => key.startsWith(`${tenant}/`))
    .map((key: Addr_Tenant_Namespace) => key.split("/")[1]);

  const namespacesMetrics = getNamespacesMetrics(
    tenant,
    tenantNamespaces,
    metrics
  );
  const result = _(namespacesMetrics)
    .toPairs()
    .map(([_, n]) => n)
    .reduce<NamespaceMetrics>((namespaceMetrics, topicMetrics) => {
      return {
        averageMsgSize: sum(
          namespaceMetrics.averageMsgSize,
          topicMetrics.averageMsgSize
        ),
        backlogSize: sum(
          namespaceMetrics.backlogSize,
          topicMetrics.backlogSize
        ),
        bytesInCount: sum(
          namespaceMetrics.bytesInCount,
          topicMetrics.bytesInCount
        ),
        bytesOutCount: sum(
          namespaceMetrics.bytesOutCount,
          topicMetrics.bytesOutCount
        ),
        msgInCount: sum(namespaceMetrics.msgInCount, topicMetrics.msgInCount),
        msgOutCount: sum(
          namespaceMetrics.msgOutCount,
          topicMetrics.msgOutCount
        ),
        msgRateIn: sum(namespaceMetrics.msgRateIn, topicMetrics.msgRateIn),
        msgRateOut: sum(namespaceMetrics.msgRateOut, topicMetrics.msgRateOut),
        msgThroughputIn: sum(
          namespaceMetrics.msgThroughputIn,
          topicMetrics.msgThroughputIn
        ),
        msgThroughputOut: sum(
          namespaceMetrics.msgThroughputOut,
          topicMetrics.msgThroughputOut
        ),
        pendingAddEntriesCount: sum(
          namespaceMetrics.pendingAddEntriesCount,
          topicMetrics.pendingAddEntriesCount
        ),
        producerCount: sum(
          namespaceMetrics.producerCount,
          topicMetrics.producerCount
        ),
        storageSize: sum(
          namespaceMetrics.storageSize,
          topicMetrics.storageSize
        ),
      };
    }, {});

  const namespacesCount = Object.keys(namespacesMetrics).length;
  result.averageMsgSize =
    result.averageMsgSize === undefined || namespacesCount === 0
      ? 0
      : result.averageMsgSize / namespacesCount;

  return result;
}
