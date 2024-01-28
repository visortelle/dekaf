import { ExportConfig, MessageFieldsConfig } from "./types";

export const defaultFieldsConfig: MessageFieldsConfig = {
  fields: [
    { id: "displayIndex", name: "Index", isActive: true },
    { id: "publishTime", name: "Publish Time", isActive: true },
    { id: "value", name: "Value", isActive: true },
    { id: "eventTime", name: "Event Time", isActive: true },
    { id: "brokerPublishTime", name: "Broker Publish Time", isActive: true },
    { id: "messageId", name: "Message Id", isActive: true },
    { id: "sequenceId", name: "Sequence Id", isActive: true },
    { id: "key", name: "Key", isActive: true },
    { id: "orderingKey", name: "Ordering Key", isActive: true },
    { id: "topic", name: "Topic", isActive: true },
    { id: "size", name: "Size", isActive: true },
    { id: "producerName", name: "Producer Name", isActive: true },
    { id: "redeliveryCount", name: "Redelivery Count", isActive: true },
    { id: "schemaVersion", name: "Schema Version", isActive: true },
    { id: "isReplicated", name: "Is Replicated", isActive: true },
    { id: "replicatedFrom", name: "Replicated From", isActive: true },
    { id: "properties", name: "Properties", isActive: true },
    { id: "rawValue", name: "Raw Value", isActive: true },
    { id: "sessionContextStateJson", name: "Consumer Session State", isActive: true },
  ],
};

export const defaultExportConfig: ExportConfig = {
  format: { type: "json-message-per-entry" },
  fields: defaultFieldsConfig,
  filePerRawValueConfig: { fileExtension: "" },
};
