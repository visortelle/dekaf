package consumer.session_runner

import consumer.start_from.{DateTimeUnit, RelativeDateTime}
import zio.test.*

import java.time.{ZoneId, ZonedDateTime}

/** `resolveRelativeDateTime` turns a "N units ago" selection into the timestamp a consumer seeks to.
  *
  * Regression context: rounding used `ZonedDateTime.truncatedTo`, which REJECTS any unit larger than
  * a day - so Week/Month/Year with "round to unit start" threw UnsupportedTemporalTypeException.
  * Three of the seven units were broken for an ordinary UI selection, surfacing only as a generic
  * FAILED_PRECONDITION on the whole session.
  *
  * A frozen `now` keeps every case deterministic (the production call passes ZonedDateTime.now()).
  */
object handleStartFromTest extends ZIOSpecDefault:

    // A Wednesday, mid-month, mid-year, with non-zero time-of-day so truncation is observable.
    private val now = ZonedDateTime.of(2026, 7, 15, 13, 47, 29, 123_000_000, ZoneId.of("UTC"))

    private def resolve(value: Int, unit: DateTimeUnit, rounded: Boolean): ZonedDateTime =
        resolveRelativeDateTime(RelativeDateTime(value = value, unit = unit, isRoundedToUnitStart = rounded), now)

    private val allUnits = List(
        DateTimeUnit.Second,
        DateTimeUnit.Minute,
        DateTimeUnit.Hour,
        DateTimeUnit.Day,
        DateTimeUnit.Week,
        DateTimeUnit.Month,
        DateTimeUnit.Year
    )

    def spec = suite(this.getClass.toString)(
        test("every unit resolves when rounding is requested") {
            // The regression itself: Week/Month/Year used to throw here.
            val failures = allUnits.flatMap { unit =>
                scala.util.Try(resolve(1, unit, rounded = true)).failed.toOption.map(t => s"$unit -> ${t.getClass.getSimpleName}")
            }
            assertTrue(failures.isEmpty) ?? s"units that threw while rounding: ${failures.mkString(", ")}"
        },
        test("every unit resolves without rounding") {
            val failures = allUnits.flatMap { unit =>
                scala.util.Try(resolve(1, unit, rounded = false)).failed.toOption.map(t => s"$unit -> ${t.getClass.getSimpleName}")
            }
            assertTrue(failures.isEmpty) ?? s"units that threw: ${failures.mkString(", ")}"
        },
        test("unrounded units subtract exactly, preserving time-of-day") {
            assertTrue(
                resolve(30, DateTimeUnit.Second, rounded = false) == now.minusSeconds(30),
                resolve(30, DateTimeUnit.Minute, rounded = false) == now.minusMinutes(30),
                resolve(5, DateTimeUnit.Hour, rounded = false) == now.minusHours(5),
                resolve(3, DateTimeUnit.Day, rounded = false) == now.minusDays(3),
                resolve(2, DateTimeUnit.Week, rounded = false) == now.minusWeeks(2),
                resolve(2, DateTimeUnit.Month, rounded = false) == now.minusMonths(2),
                resolve(1, DateTimeUnit.Year, rounded = false) == now.minusYears(1)
            )
        },
        test("rounding to the start of a second/minute/hour zeroes the finer fields") {
            val sec = resolve(0, DateTimeUnit.Second, rounded = true)
            val min = resolve(0, DateTimeUnit.Minute, rounded = true)
            val hour = resolve(0, DateTimeUnit.Hour, rounded = true)
            assertTrue(
                sec.getNano == 0,
                min.getSecond == 0 && min.getNano == 0,
                hour.getMinute == 0 && hour.getSecond == 0 && hour.getNano == 0
            )
        },
        test("rounding to the start of a day zeroes the time of day") {
            val day = resolve(3, DateTimeUnit.Day, rounded = true)
            assertTrue(
                day.getHour == 0,
                day.getMinute == 0,
                day.getSecond == 0,
                day.getNano == 0,
                day.toLocalDate == now.minusDays(3).toLocalDate
            )
        },
        test("rounding to the start of a week lands on Monday at midnight") {
            // now is Wed 2026-07-15; one week earlier is Wed 2026-07-08, whose week starts Mon 2026-07-06.
            val week = resolve(1, DateTimeUnit.Week, rounded = true)
            assertTrue(
                week.getDayOfWeek == java.time.DayOfWeek.MONDAY,
                week.getHour == 0 && week.getMinute == 0 && week.getSecond == 0 && week.getNano == 0,
                !week.isAfter(now.minusWeeks(1))
            )
        },
        test("rounding to the start of a month lands on the 1st at midnight") {
            val month = resolve(2, DateTimeUnit.Month, rounded = true)
            assertTrue(
                month.getDayOfMonth == 1,
                month.getMonthValue == 5, // 2026-07-15 minus 2 months -> May
                month.getYear == 2026,
                month.getHour == 0 && month.getMinute == 0 && month.getSecond == 0 && month.getNano == 0
            )
        },
        test("rounding to the start of a year lands on Jan 1st at midnight") {
            val year = resolve(1, DateTimeUnit.Year, rounded = true)
            assertTrue(
                year.getDayOfYear == 1,
                year.getMonthValue == 1,
                year.getYear == 2025,
                year.getHour == 0 && year.getMinute == 0 && year.getSecond == 0 && year.getNano == 0
            )
        },
        test("a rounded result is never later than the unrounded one") {
            val violations = allUnits.filter { unit =>
                resolve(1, unit, rounded = true).isAfter(resolve(1, unit, rounded = false))
            }
            assertTrue(violations.isEmpty) ?? s"rounding moved these units forward in time: $violations"
        },
        test("value = 0 with rounding gives the start of the current unit") {
            val month = resolve(0, DateTimeUnit.Month, rounded = true)
            assertTrue(month.getYear == 2026, month.getMonthValue == 7, month.getDayOfMonth == 1)
        },
        test("a year subtracted from Feb 29 lands on a valid date") {
            val leap = ZonedDateTime.of(2024, 2, 29, 10, 0, 0, 0, ZoneId.of("UTC"))
            val got = resolveRelativeDateTime(
                RelativeDateTime(value = 1, unit = DateTimeUnit.Year, isRoundedToUnitStart = false),
                leap
            )
            assertTrue(got.getYear == 2023, got.getMonthValue == 2, got.getDayOfMonth == 28)
        },
        test("a month subtracted from the 31st clamps to the shorter month") {
            val endOfMonth = ZonedDateTime.of(2026, 3, 31, 10, 0, 0, 0, ZoneId.of("UTC"))
            val got = resolveRelativeDateTime(
                RelativeDateTime(value = 1, unit = DateTimeUnit.Month, isRoundedToUnitStart = false),
                endOfMonth
            )
            assertTrue(got.getMonthValue == 2, got.getDayOfMonth == 28)
        },
        test("rounding across a DST transition keeps midnight wall-clock time") {
            // Europe/Berlin springs forward on 2026-03-29; rounding must not yield 01:00 or 23:00.
            val berlin = ZonedDateTime.of(2026, 4, 10, 15, 30, 0, 0, ZoneId.of("Europe/Berlin"))
            val got = resolveRelativeDateTime(
                RelativeDateTime(value = 2, unit = DateTimeUnit.Week, isRoundedToUnitStart = true),
                berlin
            )
            assertTrue(got.getHour == 0, got.getMinute == 0, got.getDayOfWeek == java.time.DayOfWeek.MONDAY)
        }
    )
