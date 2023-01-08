import { parseLogLine } from "./loggin";

describe("parseLogLine", () => {
  it("should parse log line", () => {
    expect(parseLogLine("[LOG] This is a log line")).toEqual([
      "LOG",
      "This is a log line",
    ]);
    expect(parseLogLine("[INFO] This is an info line")).toEqual([
      "INFO",
      "This is an info line",
    ]);
    expect(parseLogLine("[WARN] This is a warn line")).toEqual([
      "WARN",
      "This is a warn line",
    ]);
    expect(parseLogLine("[ERROR] This is an error line")).toEqual([
      "ERROR",
      "This is an error line",
    ]);
    expect(parseLogLine("[DEBUG] This is a debug line")).toEqual([
      "DEBUG",
      "This is a debug line",
    ]);
    expect(parseLogLine("This is an unknown line")).toEqual([
      "UNKNOWN",
      "This is an unknown line",
    ]);

    expect(parseLogLine("[LOG] [STUFF] This is a log line")).toEqual([
      "LOG",
      "[STUFF] This is a log line",
    ]);
    expect(parseLogLine("[INFO] This [STUFF] is an info line")).toEqual([
      "INFO",
      "This [STUFF] is an info line",
    ]);
    expect(parseLogLine("[WARN] This is [STUFF] a warn line")).toEqual([
      "WARN",
      "This is [STUFF] a warn line",
    ]);
    expect(parseLogLine("[ERROR] This is an [STUFF] error line")).toEqual([
      "ERROR",
      "This is an [STUFF] error line",
    ]);
    expect(parseLogLine("[DEBUG] This is a debug [STUFF] line")).toEqual([
      "DEBUG",
      "This is a debug [STUFF] line",
    ]);
    expect(parseLogLine("This is an unknown line [STUFF]")).toEqual([
      "UNKNOWN",
      "This is an unknown line [STUFF]",
    ]);
  });
});
