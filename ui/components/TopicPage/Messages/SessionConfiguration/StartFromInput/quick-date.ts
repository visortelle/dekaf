import dayjs from "dayjs";

export const quickDates = [
  "now",
  "5-minutes-ago",
  "15-minutes-ago",
  "30-minutes-ago",
  "1-hour-ago",
  "3-hour-ago",
  "6-hour-ago",
  "12-hours-ago",
  "24-hours-ago",
  "last-2-days",
  "7-days-ago",
  "30-days-ago",
  "90-days-ago",
  "6-months-ago",
  "1-year-ago",
  "2-years-ago",
  "last-5-years",
  "yesterday",
  "day-before-yesterday",
  "this-day-last-week",
  "previous-week",
  "previous-month",
] as const;
export type QuickDate = typeof quickDates[number];

export function quickDateToDate(qd: QuickDate, relativeTo: Date): Date {
  switch (qd) {
    case "now": return new Date();
    case "5-minutes-ago":
      return dayjs(relativeTo).subtract(5, "minute").toDate();
    case "15-minutes-ago":
      return dayjs(relativeTo).subtract(15, "minute").toDate();
    case "30-minutes-ago":
      return dayjs(relativeTo).subtract(30, "minute").toDate();
    case "1-hour-ago":
      return dayjs(relativeTo).subtract(1, "hour").toDate();
    case "3-hour-ago":
      return dayjs(relativeTo).subtract(3, "hour").toDate();
    case "6-hour-ago":
      return dayjs(relativeTo).subtract(6, "hour").toDate();
    case "12-hours-ago":
      return dayjs(relativeTo).subtract(12, "hour").toDate();
    case "24-hours-ago":
      return dayjs(relativeTo).subtract(24, "hour").toDate();
    case "last-2-days":
      return dayjs(relativeTo).subtract(2, "day").toDate();
    case "7-days-ago":
      return dayjs(relativeTo).subtract(7, "day").toDate();
    case "30-days-ago":
      return dayjs(relativeTo).subtract(30, "day").toDate();
    case "90-days-ago":
      return dayjs(relativeTo).subtract(90, "day").toDate();
    case "6-months-ago":
      return dayjs(relativeTo).subtract(6, "month").toDate();
    case "1-year-ago":
      return dayjs(relativeTo).subtract(1, "year").toDate();
    case "2-years-ago":
      return dayjs(relativeTo).subtract(2, "year").toDate();
    case "last-5-years":
      return dayjs(relativeTo).subtract(5, "year").toDate();
    case "yesterday":
      return dayjs(relativeTo).subtract(1, "day").startOf("day").toDate();
    case "day-before-yesterday":
      return dayjs(relativeTo).subtract(2, "day").startOf("day").toDate();
    case "this-day-last-week":
      return dayjs(relativeTo).subtract(1, "week").startOf("day").toDate();
    case "previous-week":
      return dayjs(relativeTo).subtract(1, "week").startOf("week").toDate();
    case "previous-month":
      return dayjs(relativeTo).subtract(1, "month").startOf("month").toDate();
  }
}
