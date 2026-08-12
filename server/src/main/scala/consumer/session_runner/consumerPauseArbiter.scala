package consumer.session_runner

import org.apache.pulsar.client.api.Consumer

import scala.util.Try

/** Why a consumer is currently held still. A consumer runs exactly when NOBODY holds it. */
enum PauseReason:
    /** The session's own pause - the user pressed the button (or the gate is closed). */
    case User

    /** Start-from flow control holding a hot stream at its memory watermark. */
    case Merge

    /** The delivery rate limiter's permit hold while its paced backlog is over its watermark. */
    case Limiter

    /** The GUARANTEED replay boundary: this consumer delivered past the recorded end mid-replay
      * (its output belongs to the next chunk), or the whole session auto-paused at caught-up.
      * Released by Resume - which extends the boundary - and by the live switch to Best effort. */
    case Boundary

/** The ONE place a consumer's paused/running state is decided.
  *
  * Three mechanisms legitimately pause consumers - the user, the start-from merge's flow control,
  * and the delivery rate limiter - and they used to call `consumer.pause()` / `resume()` directly,
  * at each other's expense: the merge's settle-time resume woke consumers the LIMITER had just
  * held (its permit flag then said "held" while nothing was, so it never re-paused and the paced
  * queue grew without bound), and a user resume woke merge-held hot streams. Each mechanism now
  * only adds or removes ITS OWN reason; the consumer resumes only once the reason set is empty,
  * so no owner can stomp another's hold.
  *
  * `hold` RE-ASSERTS the client-local pause flag every time (idempotent and effectively free),
  * so even a rogue direct `resume()` somewhere is healed by the next hold of any reason.
  */
final class ConsumerPauseArbiter(consumer: Consumer[Array[Byte]]):
    private val reasons = scala.collection.mutable.Set.empty[PauseReason]

    /** Add `reason` and ensure the consumer is paused. False when the client call threw - the
      * reason is recorded regardless, so a later release still balances the books. */
    def hold(reason: PauseReason): Boolean = synchronized {
        reasons += reason
        Try(consumer.pause()).isSuccess
    }

    /** Drop `reason`; the consumer resumes only once NO reason remains. False when the resume
      * call threw (the reason is dropped regardless). */
    def release(reason: PauseReason): Boolean = synchronized {
        reasons -= reason
        if reasons.isEmpty then Try(consumer.resume()).isSuccess else true
    }

    /** The reasons currently holding this consumer - the observable truth, exposed for tests. */
    def heldReasons: Set[PauseReason] = synchronized(reasons.toSet)
