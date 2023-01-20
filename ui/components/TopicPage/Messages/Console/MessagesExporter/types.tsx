import { MessageDescriptor } from "../../types";

export type CsvConfig = {
  quotes: boolean,
  quoteChar: string,
  escapeChar: string,
  delimiter: string,
  header: boolean,
  newline: string,
  escapeFormulae: {
    type: 'true'
  } | {
    type: 'false',
  } | {
    type: 'regex',
    regex: string,
  },
}

export type MessageField = {
  id: keyof MessageDescriptor,
  name: string,
  isActive: boolean,
};
export type MessageFieldsConfig = {
  fields: MessageField[],
}

export type Format = {
  type: 'json-message-per-entry',
} | {
  type: 'json-value-per-entry',
} | {
  type: 'json-file-per-value',
} | {
  type: 'csv-message-per-row',
} | {
  type: 'csv-value-per-row',
} | {
  type: 'file-per-raw-value',
};

export type ExportConfig = {
  format: Format,
  csvConfig: CsvConfig,
  fields: MessageFieldsConfig
}

export type ExportResultEntry = {
  fileName: string,
  content: string,
};
export type ExportResult = {
  entries: ExportResultEntry[],
};
