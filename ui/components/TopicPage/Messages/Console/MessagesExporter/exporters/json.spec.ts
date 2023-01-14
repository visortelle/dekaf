import { serializeBigArray } from "./json";

describe("serializeBigArray", () => {
  it("serialize array of objects as minified JSON", () => {
    const got = serializeBigArray(
      [
        { name: "John", age: 42 },
        { name: "Jane", age: 42 },
      ]
    );

    expect(new TextDecoder().decode(got)).toBe(
      '[{"name":"John","age":42},{"name":"Jane","age":42}]'
    );
  });

  it("handle big arrays", () => {
    const bytesInKb = 1024;
    const megabytesCount = 256;

    const bigArray = Array.from({ length: megabytesCount * bytesInKb }).map(
      () => ({
        numbers: Array.from({ length: bytesInKb }).map(() => 42),
      })
    );

    const got = serializeBigArray(bigArray);

    console.log("gto.length", got.length);

    expect(got.length).toBeGreaterThanOrEqual(megabytesCount * bytesInKb);
  });

  it("return [] if no data to serialize", () => {
    const got = serializeBigArray([]);
    expect(new TextDecoder().decode(got)).toBe("[]");
  });
});
