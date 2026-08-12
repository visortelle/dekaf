package producer

import zio.*
import zio.test.*

import com.google.protobuf.ByteString
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.producer.{MessageFormat, ProducerMessage, SendRequest, SendResponse}
import org.apache.pulsar.client.admin.{PulsarAdmin, Schemas}
import org.apache.pulsar.client.api.transaction.Transaction
import org.apache.pulsar.client.api.{MessageId, Producer, ProducerStats, Schema, TypedMessageBuilder}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import pulsar_auth.RequestContext

import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

/** Service-level coverage for `ProducerServiceImpl.send` - the method itself, not its helpers.
  *
  * `awaitSendsTest` pins the tail helper, but nothing proved that `send` still CALLS it, nor what
  * `send` does to the broker when the batch it was handed is only partly valid. Both are properties
  * of the method, so they are asserted by invoking the real `send`.
  *
  * The server test tier has no broker (CI runs these before Pulsar is even started), so the Pulsar
  * client interfaces are implemented directly here rather than with a mocking library. `Recording`
  * is deliberately dumb: it appends every `sendAsync` payload to a queue and hands back a
  * caller-supplied future. That queue is the broker oracle - "what actually got published" - and the
  * future is the broker's verdict, controllable by hand so "answered before the ack" is observable
  * instead of timing-dependent. Every method `send` does not use is left `???`, so an unexpected
  * interaction fails loudly rather than passing silently.
  *
  * Each test builds its own service instance and producer, so parallel execution is safe.
  */
object ProducerSendTest extends ZIOSpecDefault {

    private final class Recording(nextFuture: () => CompletableFuture[MessageId]) extends Producer[Array[Byte]]:
        /** Every payload handed to the broker, in call order. */
        private val sent = ConcurrentLinkedQueue[String]()

        def published: List[String] = sent.asScala.toList

        private def record(value: Array[Byte]): CompletableFuture[MessageId] =
            // `nextFuture` first: it may THROW, which is how a real builder/`sendAsync` reports a
            // synchronous failure (producer closed, payload over the max message size), and in that
            // case nothing was submitted, so nothing may be recorded as published either.
            val future = nextFuture()
            sent.add(String(value, "UTF-8"))
            future

        override def newMessage(): TypedMessageBuilder[Array[Byte]] = Builder(this)
        override def getTopic: String = "persistent://public/default/send-test"

        override def newMessage[V](schema: Schema[V]): TypedMessageBuilder[V] = ???
        override def newMessage(txn: Transaction): TypedMessageBuilder[Array[Byte]] = ???
        override def getProducerName: String = ???
        override def send(message: Array[Byte]): MessageId = ???
        override def sendAsync(message: Array[Byte]): CompletableFuture[MessageId] = ???
        override def flush(): Unit = ???
        override def flushAsync(): CompletableFuture[Void] = ???
        override def getLastSequenceId: Long = ???
        override def getStats: ProducerStats = ???
        override def close(): Unit = ???
        override def closeAsync(): CompletableFuture[Void] = ???
        override def isConnected: Boolean = ???
        override def getLastDisconnectedTimestamp: Long = ???
        override def getNumOfPartitions: Int = ???

        private final class Builder(producer: Recording) extends TypedMessageBuilder[Array[Byte]]:
            private var payload: Array[Byte] = Array.empty

            override def value(value: Array[Byte]): TypedMessageBuilder[Array[Byte]] =
                payload = value
                this
            override def properties(properties: java.util.Map[String, String]): TypedMessageBuilder[Array[Byte]] = this
            override def key(key: String): TypedMessageBuilder[Array[Byte]] = this
            override def eventTime(timestamp: Long): TypedMessageBuilder[Array[Byte]] = this
            override def sendAsync(): CompletableFuture[MessageId] = producer.record(payload)

            override def send(): MessageId = ???
            override def keyBytes(key: Array[Byte]): TypedMessageBuilder[Array[Byte]] = ???
            override def orderingKey(orderingKey: Array[Byte]): TypedMessageBuilder[Array[Byte]] = ???
            override def property(name: String, value: String): TypedMessageBuilder[Array[Byte]] = ???
            override def sequenceId(sequenceId: Long): TypedMessageBuilder[Array[Byte]] = ???
            override def replicationClusters(clusters: java.util.List[String]): TypedMessageBuilder[Array[Byte]] = ???
            override def disableReplication(): TypedMessageBuilder[Array[Byte]] = ???
            override def deliverAt(timestamp: Long): TypedMessageBuilder[Array[Byte]] = ???
            override def deliverAfter(delay: Long, unit: java.util.concurrent.TimeUnit): TypedMessageBuilder[Array[Byte]] = ???
            override def loadConf(config: java.util.Map[String, Object]): TypedMessageBuilder[Array[Byte]] = ???

    /** A PulsarAdmin that answers exactly one question: "what schema does this topic carry?". */
    private final class SchemaOnlyAdmin(schemaInfo: SchemaInfo) extends PulsarAdmin:
        override def schemas(): Schemas = SchemaLookup(schemaInfo)

        override def clusters(): org.apache.pulsar.client.admin.Clusters = ???
        override def brokers(): org.apache.pulsar.client.admin.Brokers = ???
        override def tenants(): org.apache.pulsar.client.admin.Tenants = ???
        override def resourcegroups(): org.apache.pulsar.client.admin.ResourceGroups = ???
        override def properties(): org.apache.pulsar.client.admin.Properties = ???
        override def namespaces(): org.apache.pulsar.client.admin.Namespaces = ???
        override def topics(): org.apache.pulsar.client.admin.Topics = ???
        override def topicPolicies(): org.apache.pulsar.client.admin.TopicPolicies = ???
        override def topicPolicies(isGlobal: Boolean): org.apache.pulsar.client.admin.TopicPolicies = ???
        override def bookies(): org.apache.pulsar.client.admin.Bookies = ???
        override def nonPersistentTopics(): org.apache.pulsar.client.admin.NonPersistentTopics = ???
        override def resourceQuotas(): org.apache.pulsar.client.admin.ResourceQuotas = ???
        override def lookups(): org.apache.pulsar.client.admin.Lookup = ???
        override def functions(): org.apache.pulsar.client.admin.Functions = ???
        override def source(): org.apache.pulsar.client.admin.Source = ???
        override def sources(): org.apache.pulsar.client.admin.Sources = ???
        override def sink(): org.apache.pulsar.client.admin.Sink = ???
        override def sinks(): org.apache.pulsar.client.admin.Sinks = ???
        override def worker(): org.apache.pulsar.client.admin.Worker = ???
        override def brokerStats(): org.apache.pulsar.client.admin.BrokerStats = ???
        override def proxyStats(): org.apache.pulsar.client.admin.ProxyStats = ???
        override def getServiceUrl: String = ???
        override def packages(): org.apache.pulsar.client.admin.Packages = ???
        override def transactions(): org.apache.pulsar.client.admin.Transactions = ???
        override def close(): Unit = ???

    private final class SchemaLookup(schemaInfo: SchemaInfo) extends Schemas:
        override def getSchemaInfo(topic: String): SchemaInfo = schemaInfo

        override def getSchemaInfoAsync(topic: String): CompletableFuture[SchemaInfo] = ???
        override def getSchemaInfoWithVersion(topic: String): org.apache.pulsar.common.schema.SchemaInfoWithVersion = ???
        override def getSchemaInfoWithVersionAsync(topic: String): CompletableFuture[org.apache.pulsar.common.schema.SchemaInfoWithVersion] = ???
        override def getSchemaInfo(topic: String, version: Long): SchemaInfo = ???
        override def getSchemaInfoAsync(topic: String, version: Long): CompletableFuture[SchemaInfo] = ???
        override def deleteSchema(topic: String): Unit = ???
        override def deleteSchemaAsync(topic: String): CompletableFuture[Void] = ???
        override def deleteSchema(topic: String, force: Boolean): Unit = ???
        override def deleteSchemaAsync(topic: String, force: Boolean): CompletableFuture[Void] = ???
        override def createSchema(topic: String, schemaInfo: SchemaInfo): Unit = ???
        override def createSchemaAsync(topic: String, schemaInfo: SchemaInfo): CompletableFuture[Void] = ???
        override def createSchema(topic: String, payload: org.apache.pulsar.common.protocol.schema.PostSchemaPayload): Unit = ???
        override def createSchemaAsync(
            topic: String,
            payload: org.apache.pulsar.common.protocol.schema.PostSchemaPayload
        ): CompletableFuture[Void] = ???
        override def testCompatibility(
            topic: String,
            payload: org.apache.pulsar.common.protocol.schema.PostSchemaPayload
        ): org.apache.pulsar.common.protocol.schema.IsCompatibilityResponse = ???
        override def testCompatibilityAsync(
            topic: String,
            payload: org.apache.pulsar.common.protocol.schema.PostSchemaPayload
        ): CompletableFuture[org.apache.pulsar.common.protocol.schema.IsCompatibilityResponse] = ???
        override def getVersionBySchema(topic: String, payload: org.apache.pulsar.common.protocol.schema.PostSchemaPayload): java.lang.Long = ???
        override def getVersionBySchemaAsync(
            topic: String,
            payload: org.apache.pulsar.common.protocol.schema.PostSchemaPayload
        ): CompletableFuture[java.lang.Long] = ???
        override def testCompatibility(topic: String, schemaInfo: SchemaInfo): org.apache.pulsar.common.protocol.schema.IsCompatibilityResponse = ???
        override def testCompatibilityAsync(
            topic: String,
            schemaInfo: SchemaInfo
        ): CompletableFuture[org.apache.pulsar.common.protocol.schema.IsCompatibilityResponse] = ???
        override def getVersionBySchema(topic: String, schemaInfo: SchemaInfo): java.lang.Long = ???
        override def getVersionBySchemaAsync(topic: String, schemaInfo: SchemaInfo): CompletableFuture[java.lang.Long] = ???
        override def getAllSchemas(topic: String): java.util.List[SchemaInfo] = ???
        override def getAllSchemasAsync(topic: String): CompletableFuture[java.util.List[SchemaInfo]] = ???

    /** A JSON-schema'd topic: `jsonToValue` accepts well-formed JSON and rejects everything else, so
      * it is the shortest route to a batch that is valid up to item N and invalid at item N+1. */
    private val jsonSchema: SchemaInfo =
        SchemaInfo.builder().name("send-test").`type`(SchemaType.JSON).schema(Array.emptyByteArray).build()

    private def msg(value: String): ProducerMessage =
        ProducerMessage(value = ByteString.copyFromUtf8(value))

    private def sendRequest(format: MessageFormat, values: String*): SendRequest =
        SendRequest(producerName = "p", format = format, messages = values.map(msg))

    /** Invoke the real `send` with the admin the interceptor would have installed. */
    private def callSend(producer: Producer[Array[Byte]], request: SendRequest): Future[SendResponse] =
        val service = ProducerServiceImpl()
        service.producers.put("p", producer)
        io.grpc.Context
            .current()
            .withValue(RequestContext.pulsarAdmin, SchemaOnlyAdmin(jsonSchema))
            .call(() => service.send(request))

    private def acked(): CompletableFuture[MessageId] = CompletableFuture.completedFuture(MessageId.earliest)

    def spec = suite(this.getClass.toString)(
        // ---- finding 7: an invalid item must abort the batch BEFORE anything is published ----
        test("a batch whose second item is invalid publishes nothing") {
            // REGRESSION - `send` converted every item first but then INTERLEAVED validation with
            // `sendAsync`, so a valid item preceding an invalid one was already on the topic by the
            // time the call answered INVALID_ARGUMENT. The caller sees a wholly failed batch and
            // retries it, duplicating the item that did land. Validation must cover the whole batch
            // before the first publish.
            val producer = Recording(() => acked())
            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_JSON, """{"ok":1}""", "not json"))

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                r.getStatus.code == Code.INVALID_ARGUMENT.value,
                producer.published.isEmpty
            ) ?? s"status=${r.getStatus} published=${producer.published}"
        },
        test("a batch whose first item is invalid publishes nothing either") {
            // The symmetric case, which the interleaved version happened to get right - kept so the
            // pair pins "rejection is position-independent" rather than one lucky ordering.
            val producer = Recording(() => acked())
            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_JSON, "not json", """{"ok":1}"""))

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                r.getStatus.code == Code.INVALID_ARGUMENT.value,
                producer.published.isEmpty
            ) ?? s"status=${r.getStatus} published=${producer.published}"
        },
        test("one invalid item anywhere in a longer batch still publishes nothing") {
            val producer = Recording(() => acked())
            val values = Seq("""{"a":1}""", """{"b":2}""", """{"c":3}""", "}{", """{"d":4}""")
            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_JSON, values*))

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                r.getStatus.code == Code.INVALID_ARGUMENT.value,
                producer.published.isEmpty
            ) ?? s"status=${r.getStatus} published=${producer.published}"
        },
        test("a wholly valid batch is published in full, in request order") {
            // The control for the three above: whole-batch validation must not start rejecting or
            // dropping items that are fine.
            val producer = Recording(() => acked())
            val values = Seq("""{"a":1}""", """{"b":2}""", """{"c":3}""")
            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_JSON, values*))

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                r.getStatus.code == Code.OK.value,
                producer.published == values.toList
            ) ?? s"status=${r.getStatus} published=${producer.published}"
        },
        // ---- finding 24: `send` itself must wait for the broker, not just the helper ----
        test("send does not answer while the broker has not acked") {
            // REGRESSION - `send` used to discard the `sendAsync` futures and return Code.OK at once,
            // reporting a successful publish for messages the broker had not accepted yet. Asserted
            // through `send` rather than through `awaitSends`: restoring the immediate OK inside
            // `send` leaves every helper test green.
            val brokerVerdict = CompletableFuture[MessageId]()
            val producer = Recording(() => brokerVerdict)
            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_BYTES, "a", "b"))

            val answeredBeforeAck = response.isCompleted
            brokerVerdict.complete(MessageId.latest)

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                !answeredBeforeAck,
                r.getStatus.code == Code.OK.value,
                producer.published == List("a", "b")
            ) ?? s"answeredBeforeAck=$answeredBeforeAck status=${r.getStatus}"
        },
        test("a broker rejection arriving after the call turns send's response non-OK") {
            val brokerVerdict = CompletableFuture[MessageId]()
            val producer = Recording(() => brokerVerdict)
            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_BYTES, "a"))

            brokerVerdict.completeExceptionally(RuntimeException("Producer send timeout"))

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                r.getStatus.code == Code.FAILED_PRECONDITION.value,
                r.getStatus.message.contains("Producer send timeout")
            ) ?? s"status=${r.getStatus}"
        },
        // ---- finding 22: no verdict while any submitted send is still travelling ----
        test("a synchronous send failure on a later item waits for the items already submitted") {
            // REGRESSION - publication is submitted one item at a time, and a builder/`sendAsync`
            // that throws on item N used to break straight out of `send` with FAILED_PRECONDITION.
            // Items 1..N-1 were already in flight to the broker and their futures were dropped on
            // the floor, so the RPC answered "failed" while part of its own batch was still on its
            // way to the topic. The caller retries, and whatever landed is duplicated. Publication
            // cannot be made atomic after the fact, but the verdict must not exist until every
            // submitted send has settled.
            val submitted = java.util.concurrent.atomic.AtomicInteger(0)
            val inFlight = CompletableFuture[MessageId]()
            val producer = Recording { () =>
                if submitted.incrementAndGet() == 3 then throw RuntimeException("Producer is closed")
                inFlight
            }

            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_BYTES, "a", "b", "c"))

            val answeredWhileInFlight = response.isCompleted
            inFlight.complete(MessageId.latest)

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                !answeredWhileInFlight,
                r.getStatus.code == Code.FAILED_PRECONDITION.value,
                r.getStatus.message.contains("Producer is closed"),
                // the third item never reached the broker; the first two did and cannot be recalled
                producer.published == List("a", "b")
            ) ?? s"answeredWhileInFlight=$answeredWhileInFlight status=${r.getStatus} published=${producer.published}"
        },
        test("a broker rejection on one item does not answer while a sibling is still in flight") {
            // The same guarantee for the asynchronous half: the broker refuses item 1 while item 2
            // is still being decided. Asserted through `send` because `awaitSends` being correct
            // proves nothing if `send` stops calling it with the whole batch.
            val rejected = CompletableFuture[MessageId]()
            val stillInFlight = CompletableFuture[MessageId]()
            val nth = java.util.concurrent.atomic.AtomicInteger(0)
            val producer = Recording(() => if nth.incrementAndGet() == 1 then rejected else stillInFlight)

            val response = callSend(producer, sendRequest(MessageFormat.MESSAGE_FORMAT_BYTES, "a", "b"))
            rejected.completeExceptionally(RuntimeException("Producer fenced"))

            val answeredWhileSiblingInFlight = response.isCompleted
            stillInFlight.complete(MessageId.latest)

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                !answeredWhileSiblingInFlight,
                r.getStatus.code == Code.FAILED_PRECONDITION.value,
                r.getStatus.message.contains("Producer fenced")
            ) ?? s"answeredWhileSiblingInFlight=$answeredWhileSiblingInFlight status=${r.getStatus}"
        }
    )
}
