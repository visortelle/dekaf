import type {
  TopicsMetrics,
  TopicMetrics,
  TenantMetrics,
  Addr_Tenant_Namespace,
} from "./types";
import _ from "lodash";

function sum(a: number | undefined, b: number | undefined) {
  return a === undefined ? b : a + (b || 0);
}

export function getTopicMetricsPerBundle(
  tenant: string,
  namespace: string,
  topicType: "persistent" | "non-persistent",
  topic: string,
  metrics: TopicsMetrics
): Record<string, TopicMetrics> {
  const namespaceMetrics = _(metrics[`${tenant}/${namespace}`]);
  return namespaceMetrics.reduce<Record<string, TopicMetrics>>(
    (acc, tt, bundle) => {
      const topics = tt[topicType];
      if (topics === undefined) {
        return acc;
      }

      const topicMetrics =
        topics[`${topicType}://${tenant}/${namespace}/${topic}`];
      if (topicMetrics === undefined) {
        return acc;
      }

      return { ...acc, [bundle]: topicMetrics };
    },
    {}
  );
}

export function getTopicMetrics(
  tenant: string,
  namespace: string,
  topicType: "persistent" | "non-persistent",
  topic: string,
  metrics: TopicsMetrics
): TopicMetrics {
  const topicMetricsPerBundle = getTopicMetricsPerBundle(tenant, namespace, topicType, topic, metrics);
  const result = _(topicMetricsPerBundle)
    .toPairs()
    .value()
    .reduce<TopicMetrics>((acc, [k, v]) => {
      return {
        topicType,
        averageMsgSize: sum(acc.averageMsgSize, v.averageMsgSize),
        backlogSize: sum(acc.backlogSize, v.backlogSize),
        bytesInCount: sum(acc.bytesInCount, v.bytesInCount),
        bytesOutCount: sum(acc.bytesOutCount, v.bytesOutCount),
        msgInCount: sum(acc.msgInCount, v.msgInCount),
        msgOutCount: sum(acc.msgOutCount, v.msgOutCount),
        msgRateIn: sum(acc.msgRateIn, v.msgRateIn),
        msgRateOut: sum(acc.msgRateOut, v.msgRateOut),
        msgThroughputIn: sum(acc.msgThroughputIn, v.msgThroughputIn),
        msgThroughputOut: sum(acc.msgThroughputOut, v.msgThroughputOut),
        pendingAddEntriesCount: sum(
          acc.pendingAddEntriesCount,
          v.pendingAddEntriesCount
        ),
        producerCount: sum(acc.producerCount, v.producerCount),
        publishers: (acc.publishers || []).concat(v.publishers || []),
        replication: { ...acc.replication, ...v.replication },
        storageSize: sum(acc.storageSize, v.storageSize),
        subscriptions: { ...acc.subscriptions, ...v.subscriptions },
      };
    }, { topicType });

    if (result.averageMsgSize !== undefined) {
      result.averageMsgSize = result.averageMsgSize / (result.producerCount || 1);
    }

  return result;
}

export function getNamespaceTopicsMetrics(
  tenant: string,
  namespace: string,
  metrics: TopicsMetrics
): {
  persistent: Record<string, TopicMetrics>;
  nonPersistent: Record<string, TopicMetrics>;
} {
  const namespaceBundles = _(metrics[`${tenant}/${namespace}`]).toPairs().map(([__, v]) => v).value();
  const persistentTopics = namespaceBundles.reduce<string[]>((acc, b) => {
    return acc.concat(Object.keys(b["persistent"] || {})).map((k) => {
      const s = k.split("/");
      return s[s.length - 1];
    });
  }, []);

  const nonPersistentTopics = namespaceBundles.reduce<string[]>((acc, b) => {
    return acc.concat(Object.keys(b["non-persistent"] || {})).map((k) => {
      const s = k.split("/");
      return s[s.length - 1];
    });
  }, []);

  const persistentTopicsMetrics = persistentTopics.reduce((acc, t) => ({ ...acc, [t]: getTopicMetrics(tenant, namespace, "persistent", t, metrics) }), {});
  const nonPersistentTopicsMetrics = nonPersistentTopics.reduce((acc, t) => ({ ...acc, [t]: getTopicMetrics(tenant, namespace, "non-persistent", t, metrics) }), {});

  return {
    persistent: persistentTopicsMetrics,
    nonPersistent: nonPersistentTopicsMetrics,
  }
}

export function getTenantMetrics(
  tenant: string,
  metrics: TopicsMetrics
): TenantMetrics {
  return {}
}
