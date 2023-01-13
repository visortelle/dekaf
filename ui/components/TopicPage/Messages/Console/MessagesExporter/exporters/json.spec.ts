import { faker } from "@faker-js/faker";
import { serializeBigArray } from "./json";

// describe('Export messages as JSON', () => {
//   it('should export messages as JSON file', () => {

//   });
// })

describe("serializeBigArray", () => {
  it("should serialize array of objects as minified JSON", () => {
    const got = serializeBigArray(
      [
        { name: "John", age: 42 },
        { name: "Jane", age: 42 },
      ],
      { formatting: "minified" }
    );

    expect(new TextDecoder().decode(got)).toBe(
      '[{"name":"John","age":42},{"name":"Jane","age":42}]'
    );
  });

  it("should handle big arrays", () => {
    const bytesInKb = 1024;
    const megabytesCount = 256;

    const bigArray = Array.from({ length: megabytesCount * bytesInKb }).map(
      () => ({
        numbers: Array.from({ length: bytesInKb }).map(() => 42),
      })
    );

    const got = serializeBigArray(bigArray, {
      formatting: "minified",
    });

    console.log("gto.length", got.length);

    expect(got.length).toBeGreaterThanOrEqual(megabytesCount * bytesInKb);
  });
});
