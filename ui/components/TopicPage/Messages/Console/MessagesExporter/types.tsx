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
  type: 'json',
} | {
  type: 'json-values-only',
} | {
  type: 'json-bytes-only',
} | {
  type: 'csv',
} | {
  type: 'csv-values-only',
} | {
  type: 'csv-bytes-only',
} | {
  type: 'values',
} | {
  type: 'bytes',
};

export type ExportConfig = {
  format: Format,
  data: Data[],
  dateFormat: 'unix-epoch' | 'iso',
  csvConfig: CsvConfig,
  fields: MessageFieldsConfig
}

export type Data = {
  type: 'whole-message',
} | {
  type: 'value-only'
} | {
  type: 'bytes-only'
} | {
  type: 'accum-only'
};

export type ExportResultEntry = {
  fileName: string,
  content: string,
};
export type ExportResult = {
  entries: ExportResultEntry[],
};

