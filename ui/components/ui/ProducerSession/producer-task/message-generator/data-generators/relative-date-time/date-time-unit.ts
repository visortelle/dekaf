import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type DateTimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

export function dateTimeUnitFromPb(v: pb.DateTimeUnit): DateTimeUnit {
  switch (v) {
    case pb.DateTimeUnit.DATE_TIME_UNIT_YEAR:
      return 'year';
    case pb.DateTimeUnit.DATE_TIME_UNIT_MONTH:
      return 'month';
    case pb.DateTimeUnit.DATE_TIME_UNIT_WEEK:
      return 'week';
    case pb.DateTimeUnit.DATE_TIME_UNIT_DAY:
      return 'day';
    case pb.DateTimeUnit.DATE_TIME_UNIT_HOUR:
      return 'hour';
    case pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE:
      return 'minute';
    case pb.DateTimeUnit.DATE_TIME_UNIT_SECOND:
      return 'second';
    case pb.DateTimeUnit.DATE_TIME_UNIT_MILLISECOND:
      return 'millisecond';
    default:
      throw new Error(`Unknown DateTimeUnit ${v}`);
  }
}

export function dateTimeUnitToPb(v: DateTimeUnit): pb.DateTimeUnit {
  switch (v) {
    case 'year':
      return pb.DateTimeUnit.DATE_TIME_UNIT_YEAR;
    case 'month':
      return pb.DateTimeUnit.DATE_TIME_UNIT_MONTH;
    case 'week':
      return pb.DateTimeUnit.DATE_TIME_UNIT_WEEK;
    case 'day':
      return pb.DateTimeUnit.DATE_TIME_UNIT_DAY;
    case 'hour':
      return pb.DateTimeUnit.DATE_TIME_UNIT_HOUR;
    case 'minute':
      return pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE;
    case 'second':
      return pb.DateTimeUnit.DATE_TIME_UNIT_SECOND;
    case 'millisecond':
      return pb.DateTimeUnit.DATE_TIME_UNIT_MILLISECOND;
    default:
      throw new Error(`Unknown DateTimeUnit ${v}`);
  }
}
