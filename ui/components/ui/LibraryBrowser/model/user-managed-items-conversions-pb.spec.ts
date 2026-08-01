import { managedDateTimeSpecFromPb, managedDateTimeSpecToPb } from "./user-managed-items-conversions-pb";

/**
 * A saved DateTime and the session request built from it must agree. The picker is second-granular,
 * but a Date still carries millis, and `startFromToPb`'s dateTime case floors to whole epoch seconds
 * (`Math.floor(getTime() / 1000)`). If the at-rest value keeps those millis - as `Timestamp.fromDate`
 * would, stashing them in `nanos` - then loading a saved item and starting a session lands earlier
 * than the value on disk, and save-then-load is not a fixed point.
 */
describe("a saved managed DateTime is stored at whole-second granularity", () => {
  it("drops the sub-second part the session request would drop anyway", () => {
    const withMillis = new Date(1_700_000_000_123); // 123 ms past the whole second
    const loaded = managedDateTimeSpecFromPb(managedDateTimeSpecToPb({ dateTime: withMillis }));

    // Equal to what startFromToPb would send for the same Date - the whole second, no millis.
    expect(loaded.dateTime.getTime()).toBe(1_700_000_000_000);
    expect(loaded.dateTime.getMilliseconds()).toBe(0);
  });

  it("writes no nanos, so the timestamp is second-exact on the wire", () => {
    const savedPb = managedDateTimeSpecToPb({ dateTime: new Date(1_700_000_000_999) });

    expect(savedPb.getDateTime()!.getSeconds()).toBe(1_700_000_000);
    // `Timestamp.fromDate` would stash the 999 ms here as 999_000_000 nanos - the richer at-rest
    // value the session then throws away.
    expect(savedPb.getDateTime()!.getNanos()).toBe(0);
  });
});
