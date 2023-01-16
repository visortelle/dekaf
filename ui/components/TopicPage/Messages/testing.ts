import { MessageDescriptor, PartialMessageDescriptor } from "./types";
import { faker } from "@faker-js/faker";

const textEncoder = new TextEncoder();

export function genMessageDescriptor(
  override?: Partial<MessageDescriptor>
): MessageDescriptor {
  return {
    accum: faker.datatype.json(),
    brokerPublishTime: faker.date.past().getTime(),
    bytes: textEncoder.encode(faker.datatype.json()),
    debugStdout: faker.datatype.string(),
    eventTime: faker.date.past().getTime(),
    index: faker.datatype.number(),
    isReplicated: faker.datatype.boolean(),
    key: faker.git.shortSha(),
    messageId: textEncoder.encode(faker.datatype.json()),
    orderingKey: textEncoder.encode(faker.datatype.json()),
    producerName: faker.name.firstName(),
    properties: { propA: "valueA", propB: "valueB" },
    publishTime: faker.date.past().getTime(),
    redeliveryCount: faker.datatype.number(),
    replicatedFrom: faker.name.firstName(),
    schemaVersion: faker.datatype.number(),
    sequenceId: faker.datatype.number(),
    size: faker.datatype.number(),
    topic: faker.name.firstName(),
    value: faker.datatype.string(),
    ...override,
  };
}

export function genEmptyMessageDescriptor(
  override?: PartialMessageDescriptor
): MessageDescriptor {
  return {
    value: "",
    bytes: Uint8Array.from([]),
    accum: "",
    orderingKey: null,
    brokerPublishTime: 0,
    debugStdout: "",
    eventTime: 0,
    index: 0,
    isReplicated: false,
    key: null,
    messageId: Uint8Array.from([]),
    producerName: "",
    properties: {},
    publishTime: 0,
    redeliveryCount: 0,
    replicatedFrom: "",
    size: 0,
    schemaVersion: 0,
    sequenceId: 0,
    topic: "",
    ...override,
  };
}
