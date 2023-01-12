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

export type Format = {
  type: 'json'
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

export type Chunking = {
  type: 'no-chunking' | 'by-message-key' | 'by-topic-and-partition' | 'by-producer-name' | 'file-per-message',
};

export type ExportConfig = {
  format: Format,
  chunking: Chunking,
  data: Data[],
  dateFormat: 'unix-epoch' | 'iso',
  csvConfig: CsvConfig,
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

