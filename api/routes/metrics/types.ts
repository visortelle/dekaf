import adminClient from "pulsar-admin-client-fetch";
const client = new adminClient.Client({});
client.brokerStats.getLoadReport();

// 0xc0000000_0xffffffff
export type PulsarBundleId = string;

// tenant/namespace
export type Addr_Tenant_Namespace = string;

// persistent://tenant/namespace/topic or non-persistent://tenant/namespace/topic
export type Addr_TopicType_Tenant_Namespace_Topic = string;

export type TopicsMetrics = Record<
  Addr_Tenant_Namespace,
  Record<
    PulsarBundleId,
    Record<
      "persistent" | "nonPersistent",
      Record<Addr_TopicType_Tenant_Namespace_Topic, TopicMetrics>
    >
  >
>;

export type TopicMetrics = {
  publishers?: string[];
  replication?: Record<string, string>;
  subscriptions?: string[];
  producerCount?: number;
  averageMsgSize?: number;
  msgRateIn?: number;
  msgRateOut?: number;
  msgInCount?: number;
  bytesInCount?: number;
  msgOutCount?: number;
  bytesOutCount?: number;
  msgThroughputIn?: number;
  msgThroughputOut?: number;
  storageSize?: number;
  backlogSize?: number;
  pendingAddEntriesCount?: number;
};

export type NamespaceMetrics = {
  producerCount?: number;
  averageMsgSize?: number;
  msgRateIn?: number;
  msgRateOut?: number;
  msgInCount?: number;
  bytesInCount?: number;
  msgOutCount?: number;
  bytesOutCount?: number;
  msgThroughputIn?: number;
  msgThroughputOut?: number;
  storageSize?: number;
  backlogSize?: number;
  pendingAddEntriesCount?: number;
};

export type TenantMetrics = {
  producerCount?: number;
  averageMsgSize?: number;
  msgRateIn?: number;
  msgRateOut?: number;
  msgInCount?: number;
  bytesInCount?: number;
  msgOutCount?: number;
  bytesOutCount?: number;
  msgThroughputIn?: number;
  msgThroughputOut?: number;
  storageSize?: number;
  backlogSize?: number;
  pendingAddEntriesCount?: number;
};
