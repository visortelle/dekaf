import { MessageFieldsConfig, ExportConfig, CsvConfig } from "./types";
import {
  defaultCsvConfig,
  defaultExportConfig,
  defaultFieldsConfig,
} from "./defaults";
import { uniqWith } from "lodash";

export function genMessageFieldsConfig(
  override?: Partial<MessageFieldsConfig>,
  fieldsOverride?: MessageFieldsConfig["fields"]
): MessageFieldsConfig {
  return {
    fields: uniqWith(
      [...defaultFieldsConfig.fields, ...(fieldsOverride || [])],
      (a, b) => a.id === b.id
    ),
    ...override,
  };
}

export function genCsvConfig(override?: Partial<CsvConfig>): CsvConfig {
  return {
    ...defaultCsvConfig,
    ...override,
  };
}

export function genExportConfig(override?: Partial<ExportConfig>): ExportConfig {
  return {
    ...defaultExportConfig,
    ...override,
  };
}
