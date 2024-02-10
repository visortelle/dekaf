import { MessageDescriptor, PartialMessageDescriptor } from "./types";
import { faker } from "@faker-js/faker";

const textEncoder = new TextEncoder();

export function genMessageDescriptor(
  override?: Partial<MessageDescriptor>
): MessageDescriptor {
  return {
    sessionContextStateJson: faker.datatype.json(),
    brokerPublishTime: faker.date.past().getTime(),
    rawValue: textEncoder.encode(faker.datatype.json()),
    debugStdout: faker.datatype.string(),
    eventTime: faker.date.past().getTime(),
    displayIndex: faker.datatype.number(),
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
    sessionTargetIndex: faker.datatype.number(),
    sessionColorRuleChainTestResults: [],
    sessionTargetColorRuleChainTestResults: [],
    sessionMessageFilterChainTestResult: null,
    sessionTargetMessageFilterChainTestResult: null,
    sessionTargetValueProjectionListResult: [],
    sessionValueProjectionListResult: [],
    numMessageProcessed: 0,
    numMessageSent: 0,
    ...override,
  };
}

export function genEmptyMessageDescriptor(
  override?: PartialMessageDescriptor
): MessageDescriptor {
  return {
    value: "",
    rawValue: Uint8Array.from([]),
    sessionContextStateJson: "",
    orderingKey: null,
    brokerPublishTime: 0,
    debugStdout: "",
    eventTime: 0,
    displayIndex: 0,
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
    sessionTargetIndex: 0,
    sessionColorRuleChainTestResults: [],
    sessionTargetColorRuleChainTestResults: [],
    sessionMessageFilterChainTestResult: null,
    sessionTargetMessageFilterChainTestResult: null,
    sessionTargetValueProjectionListResult: [],
    sessionValueProjectionListResult: [],
    numMessageProcessed: 0,
    numMessageSent: 0,
    ...override,
  };
}
