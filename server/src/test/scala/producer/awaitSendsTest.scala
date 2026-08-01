package producer

import zio.*
import zio.test.*

import com.google.rpc.code.Code
import org.apache.pulsar.client.api.MessageId

import java.util.concurrent.CompletableFuture

/** `producer.awaitSends` is the tail of `ProducerServiceImpl.send`: it turns the in-flight
  * `sendAsync` futures into the gRPC response.
  *
  * Regression context: `send` called `newMessage.sendAsync` and DISCARDED every future, then
  * answered `Code.OK` unconditionally. A Pulsar `sendAsync` future completes only when the broker
  * has acknowledged (or rejected) the message, so every asynchronous rejection - schema
  * incompatibility, producer fenced, exceeded quota, terminated topic, send timeout - was reported
  * to the UI as a successful publish for a message that never landed.
  *
  * The second half of the same defect: once the futures WERE awaited, `Future.sequence` awaited them
  * fail-fast, so one rejection completed the RPC while its siblings were still travelling to the
  * broker. Those siblings landed after the caller had been told the batch failed, and the obvious
  * retry duplicated them. Publication is not atomic - `send` submits one item at a time - so what
  * this helper owes the caller is that the batch has stopped moving by the time its verdict exists.
  *
  * These use real `CompletableFuture`s (exactly what the Pulsar client hands back) rather than a
  * mock producer, and complete them by hand so the "answered before the ack" case is observable
  * instead of timing-dependent. `awaitSends` holds no shared state, so parallel execution is safe.
  */
object awaitSendsTest extends ZIOSpecDefault {

    private def acked(): CompletableFuture[MessageId] =
        CompletableFuture.completedFuture(MessageId.earliest)

    private def pending(): CompletableFuture[MessageId] =
        new CompletableFuture[MessageId]()

    def spec = suite(this.getClass.toString)(
        test("no response is produced while a send is still in flight") {
            val inFlight = pending()
            val response = awaitSends(Seq(acked(), inFlight))

            val answeredBeforeAck = response.isCompleted
            inFlight.complete(MessageId.latest)

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(!answeredBeforeAck, r.getStatus.code == Code.OK.value) ??
                "the response must not exist until the broker has acked every message"
        },
        test("a rejection that arrives after the call still turns the response non-OK") {
            // The exact production shape: the response is being built while the broker is still
            // deciding, and it decides "no".
            val inFlight = pending()
            val response = awaitSends(Seq(acked(), inFlight))

            inFlight.completeExceptionally(new RuntimeException("Producer send timeout"))

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                r.getStatus.code != Code.OK.value,
                r.getStatus.message.contains("Producer send timeout")
            )
        },
        test("a rejection already present when the response is built is reported") {
            val rejected = pending()
            rejected.completeExceptionally(new RuntimeException("Topic terminated"))

            for r <- ZIO.fromFuture(_ => awaitSends(Seq(rejected, acked())))
            yield assertTrue(
                r.getStatus.code != Code.OK.value,
                r.getStatus.message.contains("Topic terminated")
            )
        },
        test("a rejection does not answer the batch while a sibling send is still in flight") {
            // REGRESSION - `Future.sequence` is FAIL-FAST: the first rejected future completed the
            // whole response while its siblings were still on their way to the broker. The caller is
            // told the batch failed, the siblings land afterwards, and the natural retry duplicates
            // them. Every submitted send has to SETTLE before the verdict exists.
            val rejected = pending()
            rejected.completeExceptionally(new RuntimeException("Producer send timeout"))
            val stillInFlight = pending()

            val response = awaitSends(Seq(rejected, stillInFlight))

            val answeredWhileSiblingInFlight = response.isCompleted
            stillInFlight.complete(MessageId.latest)

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                !answeredWhileSiblingInFlight,
                r.getStatus.code != Code.OK.value,
                r.getStatus.message.contains("Producer send timeout")
            ) ?? s"answeredWhileSiblingInFlight=$answeredWhileSiblingInFlight status=${r.getStatus}"
        },
        test("a rejection arriving mid-flight still waits for the sibling that is left") {
            // Same defect, reached the other way round: both sends are pending when the response is
            // built and one is rejected afterwards, so the fail-fast short circuit fires on the
            // completion thread rather than on the calling thread.
            val first = pending()
            val second = pending()

            val response = awaitSends(Seq(first, second))
            first.completeExceptionally(new RuntimeException("Topic terminated"))

            val answeredWhileSiblingInFlight = response.isCompleted
            second.complete(MessageId.latest)

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                !answeredWhileSiblingInFlight,
                r.getStatus.code != Code.OK.value,
                r.getStatus.message.contains("Topic terminated")
            ) ?? s"answeredWhileSiblingInFlight=$answeredWhileSiblingInFlight status=${r.getStatus}"
        },
        test("two rejections report one of them rather than losing the verdict") {
            val first = pending()
            val second = pending()
            val response = awaitSends(Seq(first, second))

            first.completeExceptionally(new RuntimeException("Producer fenced"))
            second.completeExceptionally(new RuntimeException("Topic terminated"))

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                r.getStatus.code == Code.FAILED_PRECONDITION.value,
                r.getStatus.message.contains("Producer fenced")
            ) ?? s"status=${r.getStatus}"
        },
        test("a submit failure is reported only after every send already submitted has settled") {
            // `send` publishes one item at a time, so a builder/`sendAsync` that throws on item N
            // leaves items 1..N-1 in flight. The failure the caller sees is the submit failure, but
            // it may not be produced until those siblings have settled - otherwise the RPC answers
            // while part of its own batch is still travelling to the topic.
            val inFlight = pending()
            val submitFailure = new RuntimeException("Producer is closed")

            val response = awaitSends(Seq(inFlight), Some(submitFailure))

            val answeredWhileSiblingInFlight = response.isCompleted
            inFlight.complete(MessageId.latest)

            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                !answeredWhileSiblingInFlight,
                r.getStatus.code == Code.FAILED_PRECONDITION.value,
                r.getStatus.message.contains("Producer is closed")
            ) ?? s"answeredWhileSiblingInFlight=$answeredWhileSiblingInFlight status=${r.getStatus}"
        },
        test("a submit failure with nothing in flight is reported immediately") {
            val response = awaitSends(Seq.empty, Some(new RuntimeException("Producer is closed")))
            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(
                response.isCompleted,
                r.getStatus.code == Code.FAILED_PRECONDITION.value,
                r.getStatus.message.contains("Producer is closed")
            )
        },
        test("a fully acked batch is OK") {
            for r <- ZIO.fromFuture(_ => awaitSends(Seq(acked(), acked(), acked())))
            yield assertTrue(r.getStatus.code == Code.OK.value, r.getStatus.message.isEmpty)
        },
        test("an empty batch answers OK immediately") {
            val response = awaitSends(Seq.empty)
            for r <- ZIO.fromFuture(_ => response)
            yield assertTrue(response.isCompleted, r.getStatus.code == Code.OK.value)
        }
    )
}
