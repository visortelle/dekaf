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
      "persistent" | "non-persistent",
      Record<Addr_TopicType_Tenant_Namespace_Topic, TopicMetrics>
    >
  >
>;

export type TopicPublisher = {
    msgRateIn?: number;
    msgThroughputIn?: number;
    averageMsgSize?: number;
    chunkedMessageRate?: number;
    producerId?: number;
    isSupportsPartialProducer?: boolean;
    producerName?: string;
    address?: string;
    connectedSince?: string;
    clientVersion?: string;
    metadata?: Record<string, string>;
}

export type TopicReplication = {
    msgRateIn?: number;
    msgThroughputIn?: number;
    msgRateOut?: number;
    msgThroughputOut?: number;
    msgRateExpired?: number;
    replicationBacklog?: number;
    connectedCount?: number;
    replicationDelayInSeconds?: number;
}

export type TopicSubscriptionConsumer = {
  address?: string;
  consumerName?: string;
  availablePermits?: number;
  connectedSince?: string; // ISO date time
  msgRateOut?: number;
  msgThroughputOut?: number;
  msgRateRedeliver?: number;
  avgMessagesPerEntry?: number;
  clientVersion?: string;
  metadata?: Record<string, string>;
};

export type TopicSubscription = {
  consumers?: TopicSubscriptionConsumer[];
  msgBacklog?: number;
  msgRateExpired?: number;
  msgRateOut?: number;
  msgThroughputOut?: number;
  msgRateRedeliver?: number;
  numberOfEntriesSinceFirstNotAckedMessage?: number;
  totalNonContiguousDeletedMessagesRange?: number;
  type?: string;
};

// Reference: https://github.com/apache/pulsar/blob/877795ead640039a0bcb5ef0b9aa190c3536ca1e/pulsar-client-admin-api/src/main/java/org/apache/pulsar/common/policies/data/TopicStats.java
export type TopicMetrics = {
  publishers?: TopicPublisher[];
  replication?: Record<string, TopicReplication>;
  subscriptions?: Record<string, TopicSubscription>;
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
