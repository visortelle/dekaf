package library.managed_items

import zio.test.*
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.consumer.start_from.DateTimeUnit
import library.{ManagedItemMetadata, ManagedItemType}
import scala.util.Try

/** Conversion-layer coverage for `library/managed_items/`.
  *
  *   - Defect 4 (trust boundary): `ManagedRelativeDateTimeSpec` carries a `Long` because
  *     managed_items.proto stores `value` as int64, but the api form (consumer.proto
  *     `RelativeDateTime`) is int32. A library file written by a non-Dekaf client can persist a
  *     value that is negative or out of int32 range; `fromPb` is the server-side ingestion boundary
  *     (reached by both SaveLibraryItem and the on-disk scan), so it must reject such a value loudly
  *     rather than let a later narrowing to int32 silently truncate it.
  *   - Defect 3 (dead union member): `ManagedConsumerSessionStartFromValOrRef` was removed from the
  *     `ManagedConsumerSessionStartFromSpec.startFrom` union (it is absent from the proto oneof and
  *     no conversion ever produced it). The relative-date-time member - structurally adjacent to the
  *     one removed - must still round-trip through both directions.
  */
object managedItemsConversionsTest extends ZIOSpecDefault {

    private def relativeDateTimeSpecPb(value: Long): pb.ManagedRelativeDateTimeSpec =
        pb.ManagedRelativeDateTimeSpec(
            value = value,
            unit = DateTimeUnit.toPb(DateTimeUnit.Hour),
            isRoundedToUnitStart = false
        )

    def spec = suite(this.getClass.toString)(
        test("ManagedRelativeDateTimeSpec.fromPb accepts an in-range non-negative value") {
            val small = ManagedRelativeDateTimeSpec.fromPb(relativeDateTimeSpecPb(5L))
            val zero = ManagedRelativeDateTimeSpec.fromPb(relativeDateTimeSpecPb(0L))
            // Int.MaxValue is the largest value the api int32 can hold - it must be accepted.
            val maxInt = ManagedRelativeDateTimeSpec.fromPb(relativeDateTimeSpecPb(Int.MaxValue.toLong))
            assertTrue(
                small.value == 5L,
                zero.value == 0L,
                maxInt.value == Int.MaxValue.toLong
            )
        },
        test("ManagedRelativeDateTimeSpec.fromPb rejects a value above int32 range") {
            // One past Int.MaxValue: fits int64 on disk, cannot fit the api int32 without truncation.
            val tooBig = Try(ManagedRelativeDateTimeSpec.fromPb(relativeDateTimeSpecPb(Int.MaxValue.toLong + 1L)))
            val wayBig = Try(ManagedRelativeDateTimeSpec.fromPb(relativeDateTimeSpecPb(Long.MaxValue)))
            assertTrue(
                tooBig.isFailure,
                tooBig.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                wayBig.isFailure,
                wayBig.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException])
            )
        },
        test("ManagedRelativeDateTimeSpec.fromPb rejects a negative value") {
            val negOne = Try(ManagedRelativeDateTimeSpec.fromPb(relativeDateTimeSpecPb(-1L)))
            val negBig = Try(ManagedRelativeDateTimeSpec.fromPb(relativeDateTimeSpecPb(Long.MinValue)))
            assertTrue(
                negOne.isFailure,
                negOne.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                negBig.isFailure,
                negBig.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException])
            )
        },
        test("a relative-date-time start-from still round-trips after the dead union member is removed") {
            val original = ManagedConsumerSessionStartFromSpec(
                startFrom = ManagedRelativeDateTimeValOrRef(
                    value = Some(
                        ManagedRelativeDateTime(
                            metadata = ManagedItemMetadata(
                                `type` = ManagedItemType.RelativeDateTime,
                                id = "rdt-roundtrip",
                                name = "rdt-roundtrip-name",
                                descriptionMarkdown = ""
                            ),
                            spec = ManagedRelativeDateTimeSpec(value = 7L, unit = DateTimeUnit.Day, isRoundedToUnitStart = true)
                        )
                    ),
                    reference = None
                )
            )

            val roundTripped = ManagedConsumerSessionStartFromSpec.fromPb(ManagedConsumerSessionStartFromSpec.toPb(original))

            val recoveredValue = roundTripped.startFrom match
                case v: ManagedRelativeDateTimeValOrRef => v.value.map(_.spec.value)
                case _                                  => None

            assertTrue(
                roundTripped.startFrom.isInstanceOf[ManagedRelativeDateTimeValOrRef],
                recoveredValue.contains(7L)
            )
        }
    )
}
