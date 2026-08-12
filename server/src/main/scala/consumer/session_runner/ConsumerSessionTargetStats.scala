package consumer.session_runner

import java.util.concurrent.atomic.AtomicLong

/** Per-target counters.
  *
  * ATOMIC deliberately: Pulsar delivers each partition of a partitioned topic on its own listener
  * thread, and this is incremented from the message handler BEFORE the per-message context lease, so
  * a plain `var Long` loses read-modify-write updates and a partitioned session under-counts.
  *
  * The increment stays OUTSIDE the lease on purpose - moving it inside would also move it after
  * `converters.serializeMessage`, changing whether a message that fails to deserialize still counts
  * as processed. Making the counter atomic fixes the race without touching that ordering.
  */
case class ConsumerSessionTargetStats(
    messageProcessed: AtomicLong
)
