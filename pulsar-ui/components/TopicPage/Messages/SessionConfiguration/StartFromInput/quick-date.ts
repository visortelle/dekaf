import dayjs from 'dayjs';

export const quickDates = [
  'last-5-minutes',
  'last-15-minutes',
  'last-30-minutes',
  'last-1-hour',
  'last-3-hours',
  'last-6-hours',
  'last-12-hours',
  'last-24-hours',
  'last-2-days',
  'last-7-days',
  'last-30-days',
  'last-90-days',
  'last-6-months',
  'last-1-year',
  'last-2-years',
  'last-5-years',
  'yesterday',
  'day-before-yesterday',
  'this-day-last-week',
  'previous-week',
  'previous-month'
] as const;
export type QuickDate = typeof quickDates[number];

export function quickDateToDate(qd: QuickDate, relativeTo: Date): Date {
  switch(qd) {
    case "last-5-minutes": return dayjs(relativeTo).subtract(5, "minute").toDate();
    case "last-15-minutes": return dayjs(relativeTo).subtract(15, "minute").toDate();
    case "last-30-minutes": return dayjs(relativeTo).subtract(30, "minute").toDate();
    case "last-1-hour": return dayjs(relativeTo).subtract(1, "hour").toDate();
    case "last-3-hours": return dayjs(relativeTo).subtract(3, "hour").toDate();
    case "last-6-hours": return dayjs(relativeTo).subtract(6, "hour").toDate();
    case "last-12-hours": return dayjs(relativeTo).subtract(12, "hour").toDate();
    case "last-24-hours": return dayjs(relativeTo).subtract(24, "hour").toDate();
    case "last-2-days": return dayjs(relativeTo).subtract(2, "day").toDate();
    case "last-7-days": return dayjs(relativeTo).subtract(7, "day").toDate();
    case "last-30-days": return dayjs(relativeTo).subtract(30, "day").toDate();
    case "last-90-days": return dayjs(relativeTo).subtract(90, "day").toDate();
    case "last-6-months": return dayjs(relativeTo).subtract(6, "month").toDate();
    case "last-1-year": return dayjs(relativeTo).subtract(1, "year").toDate();
    case "last-2-years": return dayjs(relativeTo).subtract(2, "year").toDate();
    case "last-5-years": return dayjs(relativeTo).subtract(5, "year").toDate();
    case "yesterday": return dayjs(relativeTo).subtract(1, "day").startOf('day').toDate();
    case "day-before-yesterday": return dayjs(relativeTo).subtract(2, "day").startOf('day').toDate();
    case "this-day-last-week": return dayjs(relativeTo).subtract(1, "week").startOf('day').toDate();
    case "previous-week": return dayjs(relativeTo).subtract(1, "week").startOf('week').toDate();
    case "previous-month": return dayjs(relativeTo).subtract(1, "month").startOf('month').toDate();
  }
}
