import * as Either from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { valueToBytes } from "./lib";

describe("valueToBytes", () => {
  it("should return error if value is not a valid json", () => {
    const got = valueToBytes("not a valid json", "json");
    expect(Either.isLeft(got)).toBe(true);
  });

  it("should return bytes if value is a valid json", () => {
    const value = '{"name": "John"}';
    const got = valueToBytes(value, "json");

    pipe(
      got,
      Either.match(
        () => {
          throw new Error("should return bytes, but error where returned");
        },
        (v) => expect(new TextDecoder().decode(v)).toEqual(value)
      )
    );
  });

  const bytesHexTestCases: { hex: string; bytes: Uint8Array }[] = [
    { hex: "", bytes: Uint8Array.from([]) },
    { hex: "a1", bytes: Uint8Array.from([161]) },
    { hex: "a1 b2 d3", bytes: Uint8Array.from([161, 178, 211]) },
    { hex: "a1b2d3", bytes: Uint8Array.from([161, 178, 211]) },
  ];

  it.each(bytesHexTestCases)(
    "should return bytes if value is a valid hex string",
    ({ hex, bytes }) => {
      const got = valueToBytes(hex, "bytes-hex");
      pipe(
        got,
        Either.match(
          () => {
            throw new Error("should return bytes, but error where returned");
          },
          (v) => expect(v).toEqual(bytes)
        )
      );
    }
  );

  // The hex parser REFUSES malformed input rather than silently assigning some other byte - it
  // throws. This function advertises an Either, and its caller checks `isRight` inside an async
  // click handler with no try around it, so a throw here rejects the handler: no toast, no message
  // sent, nothing on screen to say why.
  const invalidHexTestCases: { hex: string; why: string }[] = [
    { hex: "zz", why: "not hex digits at all" },
    { hex: "a1 zz", why: "one bad group among good ones" },
    { hex: "a1b", why: "an odd number of digits is half a byte" },
    { hex: "0xa1", why: "a JavaScript literal is not a hex byte string" },
    { hex: "a1,b2", why: "only whitespace separates bytes" },
  ];

  it.each(invalidHexTestCases)(
    "should return an error, not throw, when the hex string is invalid ($why)",
    ({ hex }) => {
      expect(() => valueToBytes(hex, "bytes-hex")).not.toThrow();
      expect(Either.isLeft(valueToBytes(hex, "bytes-hex"))).toBe(true);
    }
  );

  it("explains what was wrong with the hex it refused", () => {
    const got = valueToBytes("a1b", "bytes-hex");

    pipe(
      got,
      Either.match(
        (err) => expect(String(err.message)).toMatch(/hex/i),
        () => {
          throw new Error("should return an error, but bytes where returned");
        }
      )
    );
  });
});
