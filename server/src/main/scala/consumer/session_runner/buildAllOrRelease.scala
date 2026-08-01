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
  * The original failure is what propagates. A release that fails on the way out is swallowed
  * DELIBERATELY: it is a second failure while handling the first, and reporting it instead would
  * replace the cause with a consequence.
  *
  * PURE: `build` and `release` are plain functions, so the partial-failure path is driven with
  * lambdas and no broker.
  */
def buildAllOrRelease[A, R](inputs: Vector[A], build: A => R, release: R => Unit): Vector[R] =
    val built = Vector.newBuilder[R]
    try
        inputs.foreach(input => built += build(input))
        built.result()
    catch
        case err: Throwable =>
            built.result().foreach(resource => Try(release(resource)))
            throw err
