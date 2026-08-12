package consumer.session_runner

import scala.util.Try

/** Build one resource per input, releasing everything ALREADY BUILT if any later one fails.
  *
  * A consumer session is built out of resources the broker holds on its behalf: one Pulsar consumer
  * per physical topic, one target runner per enabled target. They were created in a plain `map`, so
  * a failure part-way through - a topic that vanished, a broker that refused the subscription,
  * anything at all - propagated out and left every consumer created before it subscribed, running,
  * and unreachable: the partly-built runner was never returned, so nothing had a handle to close.
  * The session appeared to fail while its consumers went on holding subscriptions until the process
  * ended.
  *
  * The original failure is what propagates: a release that fails on the way out is a second failure
  * while handling the first, and REPLACING the cause with a consequence would hide why the build
  * failed at all. It is not DISCARDED, though, which is what used to happen - it rides along as a
  * SUPPRESSED cause, so the one exception the caller sees says both what went wrong and what was
  * left behind, and the resource itself is handed to `onReleaseFailure` so something still holds a
  * handle to it. Swallowing both meant a consumer that refused to close kept its subscription, its
  * connection and its listener thread with nothing anywhere able to reach it again.
  *
  * PURE: `build`, `release` and `onReleaseFailure` are plain functions, so the partial-failure path
  * is driven with lambdas and no broker.
  *
  * @param onReleaseFailure
  *   what to do with a resource whose release failed. The default does nothing - callers that
  *   have nowhere to put it are no worse off than before; the session paths pass a quarantine.
  */
def buildAllOrRelease[A, R](
    inputs: Vector[A],
    build: A => R,
    release: R => Unit,
    onReleaseFailure: (R, Throwable) => Unit = (_: R, _: Throwable) => ()
): Vector[R] =
    val built = Vector.newBuilder[R]
    try
        inputs.foreach(input => built += build(input))
        built.result()
    catch
        case err: Throwable =>
            built.result().foreach { resource =>
                Try(release(resource)).failed.foreach { releaseErr =>
                    // Guarded: `addSuppressed` throws if handed the exception it is being added to,
                    // and nothing about a cleanup path may introduce a new way to fail.
                    Try(err.addSuppressed(releaseErr))
                    Try(onReleaseFailure(resource, releaseErr))
                }
            }
            throw err
