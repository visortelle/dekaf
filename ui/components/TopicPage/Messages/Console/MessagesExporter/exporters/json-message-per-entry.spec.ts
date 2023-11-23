import { genMessageDescriptor } from "../../../testing";
import { MessageDescriptor } from "../../../types";
import { genExportConfig, genMessageFieldsConfig } from "../testing";
import { ExportConfig } from "../types";
import { genFile, genFiles, GenFileProps } from "./json-message-per-entry";

describe("genFile", () => {
  type TestDataEntry = {
    props: GenFileProps;
    expectedFileName: string;
    expectedParsedJson: any;
  };

  const testDataEntry1: TestDataEntry = {
    props: {
      chunk: {
        messages: [
          {
            key: "key2",
            sessionContextStateJson: JSON.stringify({ a: 1, b: { c: 3 } }),
            brokerPublishTime: 543,
            rawValue: null,
            debugStdout: "hello\nworld",
            eventTime: 123,
            index: 5,
            isReplicated: true,
            messageId: Uint8Array.from([1, 2, 3]),
            orderingKey: Uint8Array.from([1, 2, 3]),
            producerName: "producer",
            publishTime: 123,
            redeliveryCount: 1,
            properties: { a: "A", b: "B" },
            replicatedFrom: "cluster",
            schemaVersion: 1,
            sequenceId: 1,
            size: 100,
            topic: "topic1",
            value: null,
          },
          {
            key: "key1",
            sessionContextStateJson: JSON.stringify({ a: 1, b: { c: 3 } }),
            brokerPublishTime: 123,
            rawValue: Uint8Array.from([1, 2, 3]),
            debugStdout: "hello\nworld",
            eventTime: 123,
            index: 10,
            isReplicated: true,
            messageId: Uint8Array.from([1, 2, 3]),
            orderingKey: Uint8Array.from([1, 2, 3]),
            producerName: "producer",
            publishTime: 123,
            redeliveryCount: 1,
            properties: { a: "A", b: "B" },
            replicatedFrom: "cluster",
            schemaVersion: 1,
            sequenceId: 1,
            size: 100,
            topic: "topic1",
            value: JSON.stringify({ a: 2, b: { c: 4 } }),
          },
        ],
      },
      config: genExportConfig({
        fields: genMessageFieldsConfig(),
      }),
      fileNameFallback: "chunk-1.json",
    },
    expectedFileName: "5-10.json",
    expectedParsedJson: [
      {
        key: "key2",
        sessionContextStateJson: { a: 1, b: { c: 3 } },
        brokerPublishTime: 543,
        rawValue: null,
        debugStdout: "hello\nworld",
        eventTime: 123,
        index: 5,
        isReplicated: true,
        messageId: [1, 2, 3],
        orderingKey: [1, 2, 3],
        producerName: "producer",
        publishTime: 123,
        redeliveryCount: 1,
        properties: { a: "A", b: "B" },
        replicatedFrom: "cluster",
        schemaVersion: 1,
        sequenceId: 1,
        size: 100,
        topic: "topic1",
      },
      {
        key: "key1",
        sessionContextStateJson: { a: 1, b: { c: 3 } },
        brokerPublishTime: 123,
        rawValue: [1, 2, 3],
        debugStdout: "hello\nworld",
        eventTime: 123,
        index: 10,
        isReplicated: true,
        messageId: [1, 2, 3],
        orderingKey: [1, 2, 3],
        producerName: "producer",
        publishTime: 123,
        redeliveryCount: 1,
        properties: { a: "A", b: "B" },
        replicatedFrom: "cluster",
        schemaVersion: 1,
        sequenceId: 1,
        size: 100,
        topic: "topic1",
        value: { a: 2, b: { c: 4 } },
      },
    ],
  };

  const testDataEntry2: TestDataEntry = {
    props: {
      chunk: {
        messages: [
          {
            key: "key2",
            messageId: Uint8Array.from([1, 2, 3]),
            value: null,
          },
          {
            key: "key1",
            messageId: Uint8Array.from([1, 2, 3]),
            value: JSON.stringify({ a: 2, b: { c: 4 } }),
          },
        ],
      },
      config: genExportConfig(),
      fileNameFallback: "chunk-1.json",
    },
    expectedFileName: "chunk-1.json",
    expectedParsedJson: [
      { messageId: [1, 2, 3], key: "key2" },
      {
        messageId: [1, 2, 3],
        key: "key1",
        value: { a: 2, b: { c: 4 } },
      },
    ],
  };

  const testData: TestDataEntry[] = [testDataEntry1, testDataEntry2];

  it.each(testData)("should generate .json file from chunk", async ({ props, expectedFileName, expectedParsedJson }) => {
    const file = genFile(props);
    const messagesInFile = JSON.parse(await file.content.text());

    expect(file.name).toEqual(expectedFileName);
    expect(messagesInFile).toEqual(expectedParsedJson);
  });
});

describe("genFiles", () => {
  it("generates .json files", async () => {
    const messageValue = JSON.stringify(Array.from({ length: 1024 * 10 }).map((_, i) => i));
    const messages = Array.from({ length: 1024 * 100 }).map((_, i) => genMessageDescriptor({ index: i, value: messageValue }));

    const config: ExportConfig = genExportConfig();

    const got = genFiles({ messages, config });
    expect(got.length).toBeGreaterThan(10);
    expect(got.every((file) => file.name.endsWith(".json"))).toBe(true);
    expect(got.every((file) => file.content.type === "application/json")).toBe(true);
    expect(got.every((file) => file.content.size < 1024 * 1024 * 100)).toBe(true);
  });

  it("produces 0 files if no messages given", async () => {
    const messages: MessageDescriptor[] = [];
    const config: ExportConfig = genExportConfig();
    const got = genFiles({ messages, config });

    expect(got).toEqual([]);
  });
});
