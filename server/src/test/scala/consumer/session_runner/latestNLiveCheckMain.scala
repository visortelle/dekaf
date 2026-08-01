package consumer.session_runner

import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{PulsarClient, MessageId as PulsarMessageId}

import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.{AtomicBoolean, AtomicInteger}
import scala.util.Try

/** MANUAL live-broker verification of "latest n" under a CONCURRENT PRODUCER - the moving-anchor
  * defect that frozen-log tests structurally cannot exercise.
  *
  * Deliberately a `main` and NOT a ZIO spec: `sbt test` must stay broker-free (CI runs the server
  * suite without Pulsar). Run it by hand against the e2e stack (dekaf-e2e-pulsar on
  * localhost:6650 / localhost:18080):
  *
  *   sbt "Test/runMain consumer.session_runner.latestNLiveCheckMain"          # paced producer
  *   sbt "Test/runMain consumer.session_runner.latestNLiveCheckMain outrun"   # producer at full rate
  *
  * It creates a THROWAWAY topic (deleted afterwards), seeds an unbatched backlog, runs the REAL
  * `entryFromLatest` walk while a producer keeps publishing, then reads from the resolved cut and
  * checks, against the topic as measured AFTER the walk:
  *
  *   - the delivered set is a CONTIGUOUS SUFFIX of the final log (no gaps, no double-delivery);
  *   - it contains the final last n;
  *   - n <= delivered <= n + (messages published while the walk ran);
  *   - it is NOT the whole backlog - the failure mode this walk used to have.
  *
  * In `outrun` mode the log may genuinely move faster than the walk for its whole bound; the only
  * acceptable outcome then is `StartFromUnresolvableException` - a session refusing loudly - never
  * a "successful" session showing the wrong set.
  */
object latestNLiveCheckMain:
    private val n = 50L
    private val seed = 400

    def main(args: Array[String]): Unit =
        val outrun = args.contains("outrun")
        val adminUrl = sys.env.getOrElse("DEKAF_LIVE_CHECK_ADMIN_URL", "http://localhost:18080")
        val brokerUrl = sys.env.getOrElse("DEKAF_LIVE_CHECK_BROKER_URL", "pulsar://localhost:6650")
        val topicFqn = s"persistent://public/default/dekaf-latestn-live-${java.util.UUID.randomUUID().toString.take(8)}"

        val admin = PulsarAdmin.builder().serviceHttpUrl(adminUrl).build()
        val client = PulsarClient.builder().serviceUrl(brokerUrl).build()

        var failures = Vector.empty[String]
        def check(ok: Boolean, what: => String): Unit = if !ok then failures :+= what

        try
            admin.topics().createNonPartitionedTopic(topicFqn)
            val producer = client.newProducer().topic(topicFqn).enableBatching(false).blockIfQueueFull(true).create()
            (1 to seed).foreach(i => producer.send(s"seed-$i".getBytes("UTF-8")))

            val producedDuringResolve = AtomicInteger(0)
            val stop = AtomicBoolean(false)
            val pump = new Thread(
                (() =>
                    var i = 0
                    while !stop.get do
                        i += 1
                        producer.send(s"live-$i".getBytes("UTF-8"))
                        producedDuringResolve.incrementAndGet()
                        if !outrun then Thread.sleep(8)
                ): Runnable,
                "latest-n-live-check-producer"
            )
            pump.setDaemon(true)
            pump.start()

            val lookups = AtomicInteger(0)
            val startedAtMs = System.currentTimeMillis()
            val walkOutcome = Try {
                resolveLatestN(
                    n,
                    Vector(topicFqn),
                    topic => k => { lookups.incrementAndGet(); entryFromLatest(admin, topic)(k) },
                    latestNEntryIsOlder
                )
            }
            val walkMs = System.currentTimeMillis() - startedAtMs
            stop.set(true)
            pump.join(10_000)
            producer.flush()
            producer.close()

            println(s"topic=$topicFqn mode=${if outrun then "outrun" else "paced"}")
            println(s"walk: ${walkOutcome.fold(err => s"FAILED (${err.getClass.getSimpleName}: ${err.getMessage})", _ => "resolved")} " +
                s"in ${walkMs}ms, ${lookups.get} lookups, producedDuringResolve=${producedDuringResolve.get}")

            walkOutcome match
                case scala.util.Failure(err) =>
                    // Refusing loudly is the CORRECT outcome when the log persistently outruns the
                    // walk; anything else that throws is a real failure.
                    check(err.isInstanceOf[StartFromUnresolvableException], s"unexpected walk failure: $err")
                    check(outrun, s"the walk refused under a paced producer - it should have kept up. $err")
                case scala.util.Success(cut) =>
                    def drainFrom(startAt: PulsarMessageId, inclusive: Boolean): Vector[String] =
                        val builder = client.newReader().topic(topicFqn).startMessageId(startAt)
                        val reader = (if inclusive then builder.startMessageIdInclusive() else builder).create()
                        val out = scala.collection.mutable.ArrayBuffer.empty[String]
                        while reader.hasMessageAvailable do
                            val message = reader.readNext(10, TimeUnit.SECONDS)
                            if message == null then throw new RuntimeException("reader timed out mid-drain")
                            out += new String(message.getData, "UTF-8")
                        reader.close()
                        out.toVector

                    val all = drainFrom(PulsarMessageId.earliest, inclusive = false)
                    val delivered = cut(topicFqn) match
                        case LatestNSeek.Nothing                     => Vector.empty[String]
                        case LatestNSeek.Everything                  => all
                        case LatestNSeek.FromEntry(entryId, discard) => drainFrom(entryId, inclusive = true).drop(discard.toInt)

                    val lastN = all.takeRight(n.toInt)
                    println(s"final log=${all.size} messages; delivered=${delivered.size} " +
                        s"[${delivered.headOption.getOrElse("-")} .. ${delivered.lastOption.getOrElse("-")}]")

                    check(delivered.size >= n, s"delivered FEWER than n: ${delivered.size} < $n (cut=${cut(topicFqn)})")
                    check(
                        delivered.size <= n + producedDuringResolve.get,
                        s"delivered MORE than n + concurrent production: ${delivered.size} > $n + ${producedDuringResolve.get}"
                    )
                    check(delivered == all.takeRight(delivered.size), "delivered set is NOT a contiguous suffix of the final log")
                    check(lastN.forall(delivered.contains), "delivered set is missing part of the final last n")
                    check(delivered.size < all.size, s"WHOLE BACKLOG delivered as 'latest $n' (${delivered.size} of ${all.size})")
        finally
            Try(client.close())
            Try(admin.topics().delete(topicFqn, true))
            Try(admin.close())

        if failures.nonEmpty then
            System.err.println(failures.mkString("LIVE CHECK FAILED:\n  - ", "\n  - ", ""))
            sys.exit(1)
        else println("LIVE CHECK PASSED")
