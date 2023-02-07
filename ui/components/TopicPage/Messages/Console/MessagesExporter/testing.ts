import { MessageFieldsConfig, ExportConfig } from "./types";
import {
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

export function genExportConfig(override?: Partial<ExportConfig>): ExportConfig {
  return {
    ...defaultExportConfig,
    ...override,
  };
}
