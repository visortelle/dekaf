import { hexStringFromByteArray, hexStringToByteArray } from "./conversions";

/**
 * Regression: the shared hex parser used for binary/hex message input (message ids, "Start
 * from" positions, the producer's `bytes-hex` value) accepted malformed input and silently produced
 * bytes for it, because it fed every 2-char slice through `parseInt(_, 16)` and assigned the result
 * into a `Uint8Array` - `NaN` becomes 0, a negative becomes its two's complement, and `parseInt`
 * happily stops at the first non-hex character instead of failing.
 *
 * The `invalidCases` table below records the exact bytes each input produced BEFORE the fix.
 */
describe("hexStringToByteArray", () => {
  const validCases: { name: string; input: string; bytes: number[] }[] = [
    { name: "empty string", input: "", bytes: [] },
    { name: "whitespace only", input: "   ", bytes: [] },
    { name: "single byte", input: "a1", bytes: [0xa1] },
    { name: "packed bytes ('hex-no-space' rendering)", input: "a1b2d3", bytes: [0xa1, 0xb2, 0xd3] },
    { name: "space separated bytes ('hex-with-space' rendering)", input: "a1 b2 d3", bytes: [0xa1, 0xb2, 0xd3] },
    { name: "upper case digits", input: "A1B2", bytes: [0xa1, 0xb2] },
    { name: "surrounding whitespace", input: "  a1b2  ", bytes: [0xa1, 0xb2] },
    { name: "newline separated bytes", input: "a1\nb2", bytes: [0xa1, 0xb2] },
  ];

  it.each(validCases)("accepts $name", ({ input, bytes }) => {
    expect(hexStringToByteArray(input)).toEqual(Uint8Array.from(bytes));
  });

  it("round-trips both rendering styles produced by hexStringFromByteArray", () => {
    const bytes = Uint8Array.from([0x00, 0x0f, 0xa1, 0xff]);
    expect(hexStringToByteArray(hexStringFromByteArray(bytes, "hex-no-space"))).toEqual(bytes);
    expect(hexStringToByteArray(hexStringFromByteArray(bytes, "hex-with-space"))).toEqual(bytes);
  });

  // `producedBefore` documents the corrupt output of the pre-fix parser for that exact input.
  const invalidCases: { input: string; producedBefore: string }[] = [
    { input: "zz", producedBefore: "[0]" },
    { input: "gg", producedBefore: "[0]" },
    { input: "1g", producedBefore: "[1]" },
    { input: "g1", producedBefore: "[0]" },
    { input: "z1z2", producedBefore: "[0, 0]" },
    { input: "a1b2!!", producedBefore: "[161, 178, 0]" },
    { input: "0x", producedBefore: "[0]" },
    { input: "0xff", producedBefore: "[0, 255]" },
    { input: "-1", producedBefore: "[255]" },
    { input: "+1", producedBefore: "[1]" },
    { input: "Infinity", producedBefore: "[0, 15, 0, 0]" },
    // Whitespace was stripped everywhere, so a pair split across a space was silently regrouped.
    { input: "a 1b 2", producedBefore: "[161, 178]" },
  ];

  it.each(invalidCases)("rejects $input instead of silently producing $producedBefore", ({ input }) => {
    expect(() => hexStringToByteArray(input)).toThrow(Error);
  });

  // Odd-length input was already rejected, but by throwing a bare string literal - so callers doing
  // `catch (err) { err.message }` or `err instanceof Error` got nothing usable.
  const oddLengthCases = ["a", "abc", "a1b"];

  it.each(oddLengthCases)("rejects odd-length %s with a real Error", (input) => {
    expect(() => hexStringToByteArray(input)).toThrow(Error);
  });

  it("throws Error instances, never bare strings", () => {
    for (const input of [...invalidCases.map((c) => c.input), ...oddLengthCases]) {
      let thrown: unknown = undefined;
      try {
        hexStringToByteArray(input);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect(String((thrown as Error).message)).not.toHaveLength(0);
    }
  });
});
