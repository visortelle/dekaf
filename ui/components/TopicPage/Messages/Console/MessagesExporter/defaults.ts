import { CsvConfig, ExportConfig, MessageFieldsConfig } from "./types";

export const defaultFieldsConfig: MessageFieldsConfig = {
  fields: [
    { id: 'index', name: 'Index', isActive: true },
    { id: 'publishTime', name: 'Publish time', isActive: true },
    { id: 'value', name: 'Value', isActive: true },
    { id: 'eventTime', name: 'Event time', isActive: true },
    { id: 'brokerPublishTime', name: 'Broker publish time', isActive: true },
    { id: 'messageId', name: 'Message Id', isActive: true },
    { id: 'sequenceId', name: 'Sequence Id', isActive: true },
    { id: 'key', name: 'Key', isActive: true },
    { id: 'orderingKey', name: 'Ordering key', isActive: true },
    { id: 'topic', name: 'Topic', isActive: true },
    { id: 'size', name: 'Size', isActive: true },
    { id: 'producerName', name: 'Producer name', isActive: true },
    { id: 'redeliveryCount', name: 'Redelivery count', isActive: true },
    { id: 'schemaVersion', name: 'Schema version', isActive: true },
    { id: 'isReplicated', name: 'Is replicated', isActive: true },
    { id: 'replicatedFrom', name: 'Replicated from', isActive: true },
    { id: 'properties', name: 'Properties', isActive: true },
    { id: 'bytes', name: 'Bytes', isActive: true },
    { id: 'accum', name: 'Accum', isActive: true },
  ]
};

export const defaultCsvConfig: CsvConfig = {
  quotes: true,
  quoteChar: '"',
  escapeChar: '"',
  delimiter: ',',
  header: true,
  newline: '\r\n',
  escapeFormulae: { type: 'true' },
}

export const defaultExportConfig: ExportConfig = {
  format: { type: 'json' },
  data: [{ type: 'whole-message' }],
  dateFormat: 'iso',
  csvConfig: defaultCsvConfig,
  fields: defaultFieldsConfig,
};
