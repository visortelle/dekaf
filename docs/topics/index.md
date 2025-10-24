# Topics

In Apache Pulsar, a topic is a named stream of messages. It serves as a communication channel where producers publish messages and consumers consume them.

Topics are organized within [namespaces](/docs/namespaces), which provide logical isolation and grouping of related streams of data.

<img alt="apache pulsar resource hierarchy" src={require('../img/pulsar-resource-hierarchy.png').default} width="480px" />

## Topic Persistency

Topics can be either persistent or not persistent.

### Persistent Topics

Persistent topics data is stored on persistent storage like SSD and usually replicated across multiple machines for high durability.

It can be addressed by the following Topic FQN (Fully Qualified Name):

`persistent://<tenant>/<namespace>/<topic>`

### Non-Persistent Topics

Non persistent topics don't store it's data on persistent storage.
Avoiding storing data on disk allow to achieve lower latency, but it is not durable. In case if Pulsar broker that serves the topic will be restarted, all not consumed data will be lost.

It can be addressed by the following Topic FQN (Fully Qualified Name):

`non-persistent://<tenant>/<namespace>/<topic>`

## Topic Partitioning

Topics in Pulsar can be either non-partitioned or partitioned.

### Non-Partitioned Topics

Non-partitioned topic is a named ordered stream of messages assigned to a single broker.

### Partitioned Topics

Partitioned topic in Apache Pulsar is a logical group of multiple non-partitioned topics that is addressable by a single Topic FQN and distributed across multiple brokers.

When a message is published to a partitioned topic, Pulsar uses a partitioning function to determine which partition the message should be sent to.

Partitioned topics are particularly useful in scenarios where high throughput and parallel processing are required. They allow multiple consumers to process messages concurrently, each consuming from a different partition.

The strict message order can be guaranteed only within a single partition.

Under the hood, topic partitions are regular non-partitioned topics that have `-partition-<partition_number>` suffix in it's name.

## Producers

Each may have up to thousands of producers.

## Subscriptions

Each may have up to thousands of subscriptions.
