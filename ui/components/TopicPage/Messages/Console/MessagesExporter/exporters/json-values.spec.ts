import { genMessageDescriptor } from "../../../testing";
import { MessageDescriptor } from "../../../types";
import { genExportConfig, genMessageFieldsConfig } from "../testing";
import { ExportConfig } from "../types";
import { genJsonFile, genJsonFiles, GenJsonFileProps } from "./json-values";

describe("genJsonFile", () => {
  type TestDataEntry = {
    props: GenJsonFileProps;
    expectedFileName: string;
    expectedParsedJson: any;
  };

  const testDataEntry1: TestDataEntry = {
    props: {
      chunk: {
        messages: [
          genMessageDescriptor({ value: null, index: 10 }),
          genMessageDescriptor({ value: JSON.stringify({ a: 2, b: { c: 4 } }), index: 11 }),
          genMessageDescriptor({ value: JSON.stringify(null), index: 15 }),
        ],
      },
      config: genExportConfig({
        fields: genMessageFieldsConfig(),
      }),
      fileNameFallback: "chunk-1.json",
    },
    expectedFileName: "10-15.json",
    expectedParsedJson: [{ a: 2, b: { c: 4 } }, null],
  };

  const testData: TestDataEntry[] = [testDataEntry1];

  it.each(testData)(
    "should generate .json file from chunk",
    async ({ props, expectedFileName, expectedParsedJson }) => {
      const file = genJsonFile(props);
      const messagesInFile = JSON.parse(await file.content.text());

      expect(file.name).toEqual(expectedFileName);
      expect(messagesInFile).toEqual(expectedParsedJson);
    }
  );
});

describe("genJsonFiles", () => {
  it("generates .json files", async () => {
    const messageValue = JSON.stringify(
      Array.from({ length: 1024 * 10 }).map((_, i) => i)
    );
    const messages = Array.from({ length: 1024 * 100 }).map((_, i) =>
      genMessageDescriptor({ index: i, value: messageValue })
    );

    const config: ExportConfig = genExportConfig();

    const got = genJsonFiles({ messages, config });
    expect(got.length).toBeGreaterThan(10);
    expect(got.every((file) => file.name.endsWith(".json"))).toBe(true);
    expect(got.every((file) => file.content.type === "application/json")).toBe(
      true
    );
    expect(got.every((file) => file.content.size < 1024 * 1024 * 100)).toBe(
      true
    );
  });

  it("produces 0 files if no messages given", async () => {
    const messages: MessageDescriptor[] = [];
    const config: ExportConfig = genExportConfig();
    const got = genJsonFiles({ messages, config });

    expect(got).toEqual([]);
  });
});
