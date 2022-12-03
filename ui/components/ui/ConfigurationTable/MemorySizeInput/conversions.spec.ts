import { memorySizeToBytes, bytesToMemorySize } from "./conversions";

describe("memoryToBytes", () => {
  it("should convert memory size to bytes", () => {
    expect(memorySizeToBytes({ size: 0, unit: "MB" })).toBeCloseTo(0);
    expect(memorySizeToBytes({ size: 1, unit: "MB" })).toBeCloseTo(1024 * 1024);
    expect(memorySizeToBytes({ size: 2, unit: "MB" })).toBeCloseTo(
      1024 * 1024 * 2
    );
    expect(memorySizeToBytes({ size: 2.2, unit: "MB" })).toBeCloseTo(
      1024 * 1024 * 2.2
    );

    expect(memorySizeToBytes({ size: 1, unit: "GB" })).toBeCloseTo(
      1024 * 1024 * 1024
    );
  });
});

describe("bytesToMemorySize", () => {
  it("should convert bytes to memory size", () => {
    expect(bytesToMemorySize(0)).toEqual({ size: 0, unit: "B" });
    expect(bytesToMemorySize(1024 * 1024)).toEqual({ size: 1, unit: "MB" });

    expect(bytesToMemorySize(1024 * 1024 * 999)).toEqual({
      size: 999,
      unit: "MB",
    });

    expect(bytesToMemorySize(1024 * 1024 * 1024)).toEqual({
      size: 1,
      unit: "GB",
    });
    expect(bytesToMemorySize(1024 * 1024 * 1024 * 2.2)).toEqual({
      size: 2.2,
      unit: "GB",
    });
  });
});
