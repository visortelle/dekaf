package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import zio.test.*

import java.time.Instant
import scala.util.{Failure, Success, Try}

/** Every start-from mode has to survive the trip to protobuf and back.
  *
  * `ConsumerSessionStartFrom` is a UNION type, so its `match`es are NOT checked for exhaustiveness -
  * a mode the conversion forgot falls into `case _ => throw`, and the failure surfaces at RUNTIME as
  * a generic FAILED_PRECONDITION on saving or loading a session, not at compile time. Adding a mode
  * without adding it here is therefore silent until a user picks it, which is exactly what happened
  * to the two Nth modes: they were readable (`fromPb`) but not writable (`toPb`).
  *
  * The sweep below is over ALL modes, so a mode added later fails here rather than in production.
  */
object startFromConversionsTest extends ZIOSpecDefault:

    private val allModes: Vector[ConsumerSessionStartFrom] = Vector(
        EarliestMessage(),
        LatestMessage(),
        NthMessageAfterEarliest(n = 5),
        NthMessageBeforeLatest(n = 7),
        MessageId(messageIdBytes = Array[Byte](8, 1, 16, 2)),
        DateTime(dateTime = Instant.ofEpochSecond(1_700_000_000L, 123_000_000)),
        RelativeDateTime(value = 3, unit = DateTimeUnit.Hour, isRoundedToUnitStart = true),
        ApproximateDataPosition(fraction = 0.42),
        ApproximateTimePosition(fraction = 0.42)
    )

    /** MessageId holds an Array, whose `==` is reference identity - a round trip would never look
      * equal without this. */
    private def sameMode(a: ConsumerSessionStartFrom, b: ConsumerSessionStartFrom): Boolean =
        (a, b) match
            case (x: MessageId, y: MessageId) => x.messageIdBytes.sameElements(y.messageIdBytes)
            case _                            => a == b

    private def roundTrip(mode: ConsumerSessionStartFrom): Try[ConsumerSessionStartFrom] =
        Try(ConsumerSessionStartFrom.fromPb(ConsumerSessionStartFrom.toPb(mode)))

    def spec = suite(this.getClass.toString)(
        test("every start-from mode survives a proto round trip") {
            val failures = allModes.flatMap { mode =>
                roundTrip(mode) match
                    case Success(back) if sameMode(back, mode) => None
                    case Success(back)                         => Some(s"$mode came back as $back")
                    case Failure(err)                          => Some(s"$mode threw ${err.getClass.getSimpleName}: ${err.getMessage}")
            }
            assertTrue(failures.isEmpty) ?? s"start-from modes that do not round trip: ${failures.mkString("; ")}"
        },
        test("an approximate DATA position travels in the start_from_approximate_data_position field") {
            val encoded = ConsumerSessionStartFrom.toPb(ApproximateDataPosition(fraction = 0.6))
            assertTrue(
                encoded.startFrom.isStartFromApproximateDataPosition,
                encoded.getStartFromApproximateDataPosition.fraction == 0.6
            )
        },
        test("an approximate TIME position travels in its own field, not the data one") {
            // The two modes carry the same payload - a single double - so a conversion that reached
            // for the wrong oneof case would still round-trip a fraction and look correct. The only
            // symptom would be a session positioned by the wrong rule.
            val encoded = ConsumerSessionStartFrom.toPb(ApproximateTimePosition(fraction = 0.6))
            assertTrue(
                encoded.startFrom.isStartFromApproximateTimePosition,
                !encoded.startFrom.isStartFromApproximateDataPosition,
                encoded.getStartFromApproximateTimePosition.fraction == 0.6
            )
        },
        test("an approximate data position is read back off the wire as the model type") {
            val decoded = ConsumerSessionStartFrom.fromPb(
                pb.ConsumerSessionStartFrom(
                    startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateDataPosition(pb.ApproximateDataPosition(fraction = 0.35))
                )
            )
            assertTrue(decoded == ApproximateDataPosition(fraction = 0.35))
        },
        test("an approximate time position is read back off the wire as the model type") {
            val decoded = ConsumerSessionStartFrom.fromPb(
                pb.ConsumerSessionStartFrom(
                    startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateTimePosition(pb.ApproximateTimePosition(fraction = 0.35))
                )
            )
            assertTrue(decoded == ApproximateTimePosition(fraction = 0.35))
        },
        test("the fraction is carried at full double precision, not rounded on the way") {
            // A UI slider at 1/3 must not come back as 0.33: the entry ordinal (data) and the
            // millisecond cutoff (time) are both computed from it.
            val precise = 1.0 / 3.0
            assertTrue(
                roundTrip(ApproximateDataPosition(fraction = precise)) == Success(ApproximateDataPosition(fraction = precise)),
                roundTrip(ApproximateTimePosition(fraction = precise)) == Success(ApproximateTimePosition(fraction = precise))
            )
        },
        test("an unset oneof is still rejected") {
            // The catch-all `case _` must stay: a start-from with nothing selected is not a mode.
            val result = Try(ConsumerSessionStartFrom.fromPb(pb.ConsumerSessionStartFrom()))
            assertTrue(result.isFailure)
        },
        test("every start-from mode survives a managed-item (library) round trip") {
            // The saved-session side of the same union, with its own separate pair of matches.
            import _root_.library.managed_items.ManagedConsumerSessionStartFromSpec
            val managedModes = Vector(
                EarliestMessage(),
                LatestMessage(),
                NthMessageAfterEarliest(n = 5),
                NthMessageBeforeLatest(n = 7),
                ApproximateDataPosition(fraction = 0.42),
                ApproximateTimePosition(fraction = 0.42)
            )
            val failures = managedModes.flatMap { mode =>
                val spec = ManagedConsumerSessionStartFromSpec(startFrom = mode)
                Try(ManagedConsumerSessionStartFromSpec.fromPb(ManagedConsumerSessionStartFromSpec.toPb(spec))) match
                    case Success(back) if back == spec => None
                    case Success(back)                 => Some(s"$mode came back as ${back.startFrom}")
                    case Failure(err)                  => Some(s"$mode threw ${err.getClass.getSimpleName}: ${err.getMessage}")
            }
            assertTrue(failures.isEmpty) ?? s"managed start-from modes that do not round trip: ${failures.mkString("; ")}"
        }
    )
