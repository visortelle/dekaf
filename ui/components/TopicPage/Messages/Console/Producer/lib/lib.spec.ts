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
    { hex: "a1 b2 d3", bytes: Uint8Array.from([161, 178, 211]) },
    { hex: "a1b2d3", bytes: Uint8Array.from([161, 178, 211]) },
    { hex: "", bytes: Uint8Array.from([]) },
    { hex: "z1", bytes: Uint8Array.from([]) },
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
});
