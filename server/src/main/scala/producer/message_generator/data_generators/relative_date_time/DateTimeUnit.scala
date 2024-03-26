package producer.message_generator.data_generators.relative_date_time

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

enum DateTimeUnit:
    case Year, Month, Week, Day, Hour, Minute, Second, Millisecond

object DateTimeUnit:
    def fromPb(v: pb.DateTimeUnit): DateTimeUnit =
        v match
            case pb.DateTimeUnit.DATE_TIME_UNIT_YEAR => Year
            case pb.DateTimeUnit.DATE_TIME_UNIT_MONTH => Month
            case pb.DateTimeUnit.DATE_TIME_UNIT_WEEK => Week
            case pb.DateTimeUnit.DATE_TIME_UNIT_DAY => Day
            case pb.DateTimeUnit.DATE_TIME_UNIT_HOUR => Hour
            case pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE => Minute
            case pb.DateTimeUnit.DATE_TIME_UNIT_SECOND => Second
            case pb.DateTimeUnit.DATE_TIME_UNIT_MILLISECOND => Millisecond

    def toPb(v: DateTimeUnit): pb.DateTimeUnit =
        v match
            case Year => pb.DateTimeUnit.DATE_TIME_UNIT_YEAR
            case Month => pb.DateTimeUnit.DATE_TIME_UNIT_MONTH
            case Week => pb.DateTimeUnit.DATE_TIME_UNIT_WEEK
            case Day => pb.DateTimeUnit.DATE_TIME_UNIT_DAY
            case Hour => pb.DateTimeUnit.DATE_TIME_UNIT_HOUR
            case Minute => pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE
            case Second => pb.DateTimeUnit.DATE_TIME_UNIT_SECOND
            case Millisecond => pb.DateTimeUnit.DATE_TIME_UNIT_MILLISECOND
