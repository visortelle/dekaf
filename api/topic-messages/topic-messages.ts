import * as pulsar from "pulsar-client";

async function main() {
  const client = new pulsar.Client({
    serviceUrl: "pulsar://localhost:6650",
  });

  const consumer = await client.subscribe({
    topic: "persistent://tenant-1/namespace-1/topic-1",
    subscription: `__pulsar-ui-${Date.now()}`,
  });

  while (true) {
    if (consumer.hasNext()) {
      const message = await consumer.readNext();

      console.log(
        "Received message ==================================================="
      );
      console.log("event timestamp:", message.getEventTimestamp());
      console.log("message id:", message.getMessageId().toString());
      console.log("partition key:", message.getPartitionKey());
      console.log("properties:", message.getProperties());
      console.log("publish timestamp:", message.getPublishTimestamp());
      console.log("redelivery count:", message.getRedeliveryCount());
      console.log("topic name:", message.getTopicName());
      console.log("data:", message.getData().toString());
    }
  }
}

main();
