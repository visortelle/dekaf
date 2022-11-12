import { position } from "./position";

describe("position.compare", () => {
  it("should return 0 if positions are the same", () => {
    expect(position.compare("10:20", "10:20")).toBe(0);
  });

  it("should return positive number if first position is greater", () => {
    expect(position.compare("11:2", "1:2")).toBeGreaterThan(0);
    expect(position.compare("1:21", "1:2")).toBeGreaterThan(0);
  });

  it("should return negative number if first position is less", () => {
    expect(position.compare("1:2", "11:2")).toBeLessThan(0);
    expect(position.compare("1:2", "1:21")).toBeLessThan(0);
  });
});

describe("position.eq", () => {
  it("should return true if positions are the same", () => {
    expect(position.eq("10:20", "10:20")).toBe(true);
    expect(position.eq("10:20", "10:21")).toBe(false);
    expect(position.eq("10:20", "1:20")).toBe(false);
  });
});

describe("position.gt", () => {
  it("should return true if first position is greater", () => {
    expect(position.gt("11:2", "1:2")).toBe(true);
    expect(position.gt("1:21", "1:2")).toBe(true);
  });

  it("should return false if first position is less", () => {
    expect(position.gt("1:2", "11:2")).toBe(false);
    expect(position.gt("1:2", "1:21")).toBe(false);
  });
});

describe("position.lt", () => {
  it("should return true if first position is less", () => {
    expect(position.lt("1:2", "11:2")).toBe(true);
    expect(position.lt("1:2", "1:21")).toBe(true);
  });

  it("should return false if first position is greater", () => {
    expect(position.lt("11:2", "1:2")).toBe(false);
    expect(position.lt("1:21", "1:2")).toBe(false);
  });

  describe("position.getLedgerId", () => {
    it("should return ledgerId", () => {
      expect(position.getLedgerId("10:20")).toBe(10);
      expect(position.getLedgerId("1:20")).toBe(1);
    });
  });

  describe("position.getEntryId", () => {
    it("should return entryId", () => {
      expect(position.getEntryId("10:20")).toBe(20);
      expect(position.getEntryId("1:20")).toBe(20);
    });
  });
});
