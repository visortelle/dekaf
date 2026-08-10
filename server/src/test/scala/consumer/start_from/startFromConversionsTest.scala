package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.tools.teal.pulsar.ui.library.v1.managed_items as managedPb
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
        ApproximateEntryPosition(fraction = 0.42),
        ApproximatePublishTimePosition(fraction = 0.42)
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
        test("an approximate ENTRY position travels in the start_from_approximate_entry_position field") {
            val encoded = ConsumerSessionStartFrom.toPb(ApproximateEntryPosition(fraction = 0.6))
            assertTrue(
                encoded.startFrom.isStartFromApproximateEntryPosition,
                encoded.getStartFromApproximateEntryPosition.fraction == 0.6
            )
        },
        test("an approximate PUBLISH-TIME position travels in its own field, not the entry one") {
            // The two modes carry the same payload - a single double - so a conversion that reached
            // for the wrong oneof case would still round-trip a fraction and look correct. The only
            // symptom would be a session positioned by the wrong rule.
            val encoded = ConsumerSessionStartFrom.toPb(ApproximatePublishTimePosition(fraction = 0.6))
            assertTrue(
                encoded.startFrom.isStartFromApproximatePublishTimePosition,
                !encoded.startFrom.isStartFromApproximateEntryPosition,
                encoded.getStartFromApproximatePublishTimePosition.fraction == 0.6
            )
        },
        test("an approximate entry position is read back off the wire as the model type") {
            val decoded = ConsumerSessionStartFrom.fromPb(
                pb.ConsumerSessionStartFrom(
                    startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateEntryPosition(
                        pb.ApproximateEntryPosition(fraction = 0.35)
                    )
                )
            )
            assertTrue(decoded == ApproximateEntryPosition(fraction = 0.35))
        },
        test("an approximate publish-time position is read back off the wire as the model type") {
            val decoded = ConsumerSessionStartFrom.fromPb(
                pb.ConsumerSessionStartFrom(
                    startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximatePublishTimePosition(
                        pb.ApproximatePublishTimePosition(fraction = 0.35)
                    )
                )
            )
            assertTrue(decoded == ApproximatePublishTimePosition(fraction = 0.35))
        },
        test("the fraction is carried at full double precision, not rounded on the way") {
            // A UI slider at 1/3 must not come back as 0.33: the entry ordinal and publish-time
            // cutoff are both computed from it.
            val precise = 1.0 / 3.0
            assertTrue(
                roundTrip(ApproximateEntryPosition(fraction = precise)) == Success(ApproximateEntryPosition(fraction = precise)),
                roundTrip(ApproximatePublishTimePosition(fraction = precise)) == Success(ApproximatePublishTimePosition(fraction = precise))
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
                ApproximateEntryPosition(fraction = 0.42),
                ApproximatePublishTimePosition(fraction = 0.42)
            )
            val failures = managedModes.flatMap { mode =>
                val spec = ManagedConsumerSessionStartFromSpec(startFrom = mode)
                Try(ManagedConsumerSessionStartFromSpec.fromPb(ManagedConsumerSessionStartFromSpec.toPb(spec))) match
                    case Success(back) if back == spec => None
                    case Success(back)                 => Some(s"$mode came back as ${back.startFrom}")
                    case Failure(err)                  => Some(s"$mode threw ${err.getClass.getSimpleName}: ${err.getMessage}")
            }
            assertTrue(failures.isEmpty) ?? s"managed start-from modes that do not round trip: ${failures.mkString("; ")}"
        },
        test("saved pre-rename percentage modes remain wire-compatible") {
            // Exact old-schema wire fixtures: managed oneof tag 8/9, containing a double fraction
            // in nested field 1. Field names are absent from protobuf binary data, so retaining the
            // tags must map the legacy fields to their clearer entry/publish-time names.
            val nestedHalf = Array[Byte](0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0.toByte, 0x3f)
            val oldDataMode = Array[Byte](0x42, nestedHalf.length.toByte) ++ nestedHalf
            val oldTimeMode = Array[Byte](0x4a, nestedHalf.length.toByte) ++ nestedHalf

            import _root_.library.managed_items.ManagedConsumerSessionStartFromSpec
            val entry = ManagedConsumerSessionStartFromSpec.fromPb(managedPb.ManagedConsumerSessionStartFromSpec.parseFrom(oldDataMode))
            val publishTime = ManagedConsumerSessionStartFromSpec.fromPb(managedPb.ManagedConsumerSessionStartFromSpec.parseFrom(oldTimeMode))

            assertTrue(
                entry.startFrom == ApproximateEntryPosition(0.5),
                publishTime.startFrom == ApproximatePublishTimePosition(0.5)
            )
        }
    )
