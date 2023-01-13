import { faker } from "@faker-js/faker";
import { MessageFieldsConfig } from "./types";

export function randMessageFieldsConfig(): MessageFieldsConfig {
  return {
    fields: [
      {
        id: "key",
        isActive: faker.datatype.boolean(),
        name: "Key",
      },
      {
        id: "value",
        isActive: faker.datatype.boolean(),
        name: "Value",
      },
      {
        id: "topic",
        isActive: faker.datatype.boolean(),
        name: "Topic",
      },
      {
        id: "properties",
        isActive: faker.datatype.boolean(),
        name: "Properties",
      },
      {
        id: "messageId",
        isActive: faker.datatype.boolean(),
        name: "Message Id",
      },
      {
        id: "sequenceId",
        isActive: faker.datatype.boolean(),
        name: "Sequence Id",
      },
      {
        id: "publishTime",
        isActive: faker.datatype.boolean(),
        name: "Publish Time",
      },
      {
        id: "eventTime",
        isActive: faker.datatype.boolean(),
        name: "Event Time",
      },
      {
        id: "brokerPublishTime",
        isActive: faker.datatype.boolean(),
        name: "Broker Publish Time",
      },
      {
        id: "producerName",
        isActive: faker.datatype.boolean(),
        name: "Producer Name",
      },
      {
        id: "orderingKey",
        isActive: faker.datatype.boolean(),
        name: "Ordering Key",
      },
      {
        id: "redeliveryCount",
        isActive: faker.datatype.boolean(),
        name: "Redelivery Count",
      },
      {
        id: "replicatedFrom",
        isActive: faker.datatype.boolean(),
        name: "Replicated From",
      },
      {
        id: "isReplicated",
        isActive: faker.datatype.boolean(),
        name: "Is Replicated",
      },
      {
        id: "debugStdout",
        isActive: faker.datatype.boolean(),
        name: "Debug Stdout",
      },
      {
        id: "accum",
        isActive: faker.datatype.boolean(),
        name: "Accum",
      },
      {
        id: "schemaVersion",
        isActive: faker.datatype.boolean(),
        name: "Schema Version",
      },
      {
        id: "index",
        isActive: faker.datatype.boolean(),
        name: "Index",
      },
      {
        id: "size",
        isActive: faker.datatype.boolean(),
        name: "Size",
      },
      {
        id: "bytes",
        isActive: faker.datatype.boolean(),
        name: "Bytes",
      },
    ],
  };
}
