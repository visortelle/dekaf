import dayjs from "dayjs";

export function timestampToDate(ts: string): Date {
  const v = ts.replace(/["'`]/g, '').trim(); // It may be copy-pasted from logs with quotes or spaces
  const isUnixTimestamp = /^\d+$/.test(v);
  const isValid = isUnixTimestamp ? true : dayjs(v).isValid();
  return isValid ? dayjs(isUnixTimestamp ? Number(v) : v).toDate() : new Date(0);
}
