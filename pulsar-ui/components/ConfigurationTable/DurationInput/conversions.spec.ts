import { durationToSeconds, secondsToDuration } from "./conversions";

describe("durationToSeconds", () => {
  it("should convert duration to seconds", () => {
    expect(durationToSeconds({ value: 0, unit: "s" })).toBeCloseTo(0);
    expect(durationToSeconds({ value: 30, unit: "s" })).toBeCloseTo(30);

    expect(durationToSeconds({ value: 1, unit: "m" })).toBeCloseTo(60);
    expect(durationToSeconds({ value: 1.5, unit: "m" })).toBeCloseTo(90);

    expect(durationToSeconds({ value: 2, unit: "h" })).toBeCloseTo(60 * 60 * 2);

    expect(durationToSeconds({ value: 2.2, unit: "d" })).toBeCloseTo(
      60 * 60 * 24 * 2.2
    );
  });
});

describe("secondsToDuration", () => {
  it("should convert seconds to duration", () => {
    expect(secondsToDuration(0)).toEqual({ value: 0, unit: "s" });
    expect(secondsToDuration(30)).toEqual({ value: 30, unit: "s" });

    expect(secondsToDuration(60)).toEqual({
      value: 1,
      unit: "m",
    });

    expect(secondsToDuration(90)).toEqual({
      value: 1.5,
      unit: "m",
    });

    expect(secondsToDuration(60 * 60 * 2)).toEqual({
      value: 2,
      unit: "h",
    });

    expect(secondsToDuration(60 * 60 * 24 * 2.2)).toEqual({
      value: 2.2,
      unit: "d",
    });
  });
});
