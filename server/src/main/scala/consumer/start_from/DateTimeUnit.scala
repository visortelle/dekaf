package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

enum DateTimeUnit {
    case Second
    case Minute
    case Hour
    case Day
    case Week
    case Month
    case Year
}

object DateTimeUnit:
    def fromPb(dateTimeUnit: pb.DateTimeUnit): DateTimeUnit =
        dateTimeUnit match
            case pb.DateTimeUnit.DATE_TIME_UNIT_YEAR => DateTimeUnit.Year
            case pb.DateTimeUnit.DATE_TIME_UNIT_MONTH => DateTimeUnit.Month
            case pb.DateTimeUnit.DATE_TIME_UNIT_WEEK => DateTimeUnit.Week
            case pb.DateTimeUnit.DATE_TIME_UNIT_DAY => DateTimeUnit.Day
            case pb.DateTimeUnit.DATE_TIME_UNIT_HOUR => DateTimeUnit.Hour
            case pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE => DateTimeUnit.Minute
            case pb.DateTimeUnit.DATE_TIME_UNIT_SECOND => DateTimeUnit.Second
            case _ => throw new IllegalArgumentException(s"Unknown DateTimeUnit: $dateTimeUnit")

    def toPb(dateTimeUnit: DateTimeUnit): pb.DateTimeUnit =
        dateTimeUnit match
            case DateTimeUnit.Year => pb.DateTimeUnit.DATE_TIME_UNIT_YEAR
            case DateTimeUnit.Month => pb.DateTimeUnit.DATE_TIME_UNIT_MONTH
            case DateTimeUnit.Week => pb.DateTimeUnit.DATE_TIME_UNIT_WEEK
            case DateTimeUnit.Day => pb.DateTimeUnit.DATE_TIME_UNIT_DAY
            case DateTimeUnit.Hour => pb.DateTimeUnit.DATE_TIME_UNIT_HOUR
            case DateTimeUnit.Minute => pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE
            case DateTimeUnit.Second => pb.DateTimeUnit.DATE_TIME_UNIT_SECOND
