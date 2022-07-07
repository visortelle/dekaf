import org.apache.pulsar.client.api.Consumer
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.api.MessageListener
import tools.teal.pulsar.ui.api.messages

@main def hello: Unit =
  println("Hello world!")
  println(msg)

def msg = "I was compiled by Scala 3. :)"

val client = PulsarClient.builder().serviceUrl("pulsar://localhost:6650").build()

val listener: MessageListener[Any] = (consumer, msg) => {
  println("Message received: " ++ msg.getData)
  consumer.acknowledge(msg)
}

val consumer = client.newConsumer()
  .topic("persistent://tenant-1/namespace-1/topic-1")
  .subscriptionName("test-subscription")
  .subscribe()

def consume(tenant: String, namespace: String, topicType: "persistent" | "non-persistent", topic: String): Unit =
  ()

