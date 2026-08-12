package consumer.session_runner

import com.typesafe.scalalogging.Logger

import scala.collection.mutable.ArrayDeque
import scala.util.{Failure, Success, Try}

/** How many un-released resources one quarantine holds before the oldest is given up on.
  *
  * A bound rather than a guess about how many can fail: the entries are closures over consumers,
  * and a server whose broker refuses every release must not accumulate them without limit. Dropping
  * the OLDEST is deliberate - the newest failure is the one most likely still to be recoverable,
  * and an entry that has survived this many later failures has had that many retry rounds already.
  */
val cleanupQuarantineCapacity: Int = 256

/** RESOURCES WHOSE RELEASE FAILED, KEPT ADDRESSABLE AND RETRIED.
  *
  * A failed `unsubscribe` or `close` is the ordinary outcome of stopping a session whose consumer
  * is mid-reconnect, and both cleanup paths used to answer as though it had succeeded: the
  * partial-build unwind swallowed the failure whole, and a target's stop cleared its consumer map
  * whatever the calls did. The consumer then kept its subscription, its connection and its listener
  * thread for the life of the process, with nothing anywhere holding a reference that could close
  * it - the session runner having been discarded by its caller a moment later.
  *
  * The handle is therefore RETAINED here and the release retried. Retrying costs nothing when it
  * works (closing an already-closed Pulsar consumer is a no-op) and is the only thing that can
  * recover the case it exists for.
  *
  * PLAIN AND SYNCHRONOUS. It owns no thread: `retryPending` is called by whoever already sweeps -
  * in production, the consumer service's idle janitor - which is also what makes every property
  * here a test rather than a wait.
  */
final class CleanupQuarantine(capacity: Int = cleanupQuarantineCapacity):
    private val logger: Logger = Logger(getClass.getName)

    private final case class Pending(label: String, release: () => Unit)

    /** Guarded by this object's monitor. A LEAF: the release closures run OUTSIDE it, because they
      * call the broker. */
    private val pendingItems = ArrayDeque.empty[Pending]

    /** Retain one resource that could not be released. Idempotent per `label`, so a stop repeated
      * over the same still-failing consumer does not accumulate copies of it. */
    def quarantine(label: String, release: () => Unit): Unit = synchronized {
        if !pendingItems.exists(_.label == label) then
            if pendingItems.size >= capacity then
                val dropped = pendingItems.removeHead()
                // Maintainer-visible: past this point the resource really is leaked, and the number
                // of them says the broker has been refusing releases for a long time.
                logger.warn(
                    s"The consumer cleanup quarantine is full at $capacity entries, so ${dropped.label} was given up on. " +
                        "Its broker-side resources may still exist."
                )
            pendingItems.append(Pending(label, release))
        ()
    }

    /** What is still waiting to be released - a test's window, and what a saturation metric reads. */
    def pendingLabels: Vector[String] = synchronized(pendingItems.map(_.label).toVector)

    /** Retry every retained release; answers the labels that STILL could not be released, which are
      * put back for the next round. The snapshot is taken under the lock and the releases run
      * outside it: each is a broker call. */
    def retryPending(): Vector[String] =
        val snapshot = synchronized {
            val items = pendingItems.toVector
            pendingItems.clear()
            items
        }
        snapshot.flatMap { item =>
            Try(item.release()) match
                case Success(_) =>
                    logger.info(s"A consumer resource that could not be released earlier was released on retry: ${item.label}")
                    None
                case Failure(err) =>
                    logger.debug(s"Retrying the release of ${item.label} failed again; it stays quarantined. ${err.getMessage}")
                    quarantine(item.label, item.release)
                    Some(item.label)
        }

/** THE server-wide cleanup quarantine. One per process, like the session maintenance scheduler:
  * the sites that fail to release are deep inside session teardown and have nowhere else to hand a
  * resource to. Every one of them takes it as a defaulted parameter so a test can pass its own. */
val consumerCleanupQuarantine: CleanupQuarantine = CleanupQuarantine()
