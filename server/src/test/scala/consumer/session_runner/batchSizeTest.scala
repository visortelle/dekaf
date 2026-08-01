package consumer.session_runner

import org.apache.pulsar.client.api.{MessageId, Schema}
import org.apache.pulsar.client.impl.{BatchMessageIdImpl, MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.nio.ByteBuffer

/** `messagesInEntryOf` decides how many messages the backward walk counts for one entry, and that
  * count drives both the running total and the per-topic overshoot discard. A PRODUCER must not be
  * able to inflate it: `X-Pulsar-num-batch-message` lives in `getProperties` next to arbitrary
  * producer keys, and the admin client only overwrites it for entries it expands as real batches, so
  * a forged value survives on an unbatched message. The non-forgeable witness is the message id -
  * the admin client returns a batch id (batch index >= 0) only for a genuine batch.
  */
object batchSizeTest extends ZIOSpecDefault:

    private val topic = "persistent://public/default/batch-size"

    private def message(id: MessageId, properties: Map[String, String]): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        // publish_time is mandatory on MessageMetadata - reading it when unset throws.
        md.setPublishTime(1_700_000_000_000L)
        properties.foreach((k, v) => md.addProperty().setKey(k).setValue(v))
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap("{}".getBytes("UTF-8")), Schema.BYTES, topic)
        msg.setMessageId(id)
        msg

    def spec = suite(this.getClass.toString)(
        test("a forged batch-size property on an UNBATCHED message is ignored - the entry is one message") {
            // THE forgery. An unbatched message (plain id, batch index -1) carrying a huge
            // `X-Pulsar-num-batch-message` used to be counted as that many, overshooting the walk and
            // letting the per-topic overshoot discard swallow real messages from the stream's head.
            val forged = message(new MessageIdImpl(1L, 2L, -1), Map(batchSizeProperty -> "1000000"))
            assertTrue(messagesInEntryOf(forged) == 1) ?? s"a forged property was counted as ${messagesInEntryOf(forged)}"
        },
        test("a real batch id reports its own batch size, no property needed") {
            // The id itself carries the count when the admin client populated it - not a property at all.
            val batched = message(new BatchMessageIdImpl(1L, 2L, 0, 0, 50, null), Map.empty)
            assertTrue(messagesInEntryOf(batched) == 50)
        },
        test("a batch id the admin client left without a size falls back to the verified property") {
            // batchSize -1 on the id, but the id CONFIRMS a batch (index 0), so the property is trusted.
            val batched = message(new BatchMessageIdImpl(1L, 2L, 0, 0, -1, null), Map(batchSizeProperty -> "100"))
            assertTrue(messagesInEntryOf(batched) == 100)
        },
        test("a plain unbatched entry with no property is one message") {
            assertTrue(messagesInEntryOf(message(new MessageIdImpl(1L, 2L, -1), Map.empty)) == 1)
        },
        test("a garbage or non-positive forged size on a batch id falls back to one, never zero or negative") {
            // Even where the id confirms a batch, a property that does not parse to a positive number
            // is read as one message - the walk then goes DEEPER (over-delivers) rather than swallow.
            val negative = message(new BatchMessageIdImpl(1L, 2L, 0, 0, -1, null), Map(batchSizeProperty -> "-5"))
            val notANumber = message(new BatchMessageIdImpl(1L, 2L, 0, 0, -1, null), Map(batchSizeProperty -> "lots"))
            assertTrue(messagesInEntryOf(negative) == 1, messagesInEntryOf(notANumber) == 1)
        }
    )
