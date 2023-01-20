import { partialMessageDescriptorToJson } from "./conversions";
import { PartialMessageDescriptor } from "./types";

describe("partialMessageDescriptorToJson", () => {
  const testData: {
    message: PartialMessageDescriptor;
    expectedDeserializedObj: any;
  }[] = [
    {
      message: {
        key: null,
        accum: null,
        brokerPublishTime: null,
        rawValue: null,
        debugStdout: null,
        eventTime: null,
        index: 0,
        isReplicated: null,
        messageId: null,
        orderingKey: null,
        producerName: null,
        publishTime: null,
        redeliveryCount: null,
        properties: {},
        replicatedFrom: null,
        schemaVersion: null,
        sequenceId: null,
        size: null,
        topic: null,
        value: null,
      },
      expectedDeserializedObj: {
        key: null,
        accum: null,
        debugStdout: null,
        brokerPublishTime: null,
        rawValue: null,
        eventTime: null,
        index: 0,
        isReplicated: null,
        messageId: null,
        orderingKey: null,
        producerName: null,
        publishTime: null,
        redeliveryCount: null,
        properties: {},
        replicatedFrom: null,
        schemaVersion: null,
        sequenceId: null,
        size: null,
        topic: null,
        value: null,
      },
    },
    {
      message: {
        key: "key1",
        accum: JSON.stringify({ a: 1, b: { c: 3 } }),
        brokerPublishTime: 123,
        rawValue: Uint8Array.from([1, 2, 3]),
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
        value: JSON.stringify({ a: 2, b: { c: 4 } }),
      },
      expectedDeserializedObj: {
        key: "key1",
        accum: JSON.stringify({ a: 1, b: { c: 3 } }),
        brokerPublishTime: 123,
        rawValue: [1, 2, 3],
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
        value: JSON.stringify({ a: 2, b: { c: 4 } }),
      },
    },
    {
      message: {
        index: 1,
      },
      expectedDeserializedObj: { index: 1 },
    },
  ];

  it.each(testData)(
    "encodes MessageDescriptor to JSON",
    ({ message, expectedDeserializedObj }) => {
      const gotJson = partialMessageDescriptorToJson(message);
      const gotObj = JSON.parse(gotJson);

      expect(gotObj).toEqual(expectedDeserializedObj);
    }
  );
});
