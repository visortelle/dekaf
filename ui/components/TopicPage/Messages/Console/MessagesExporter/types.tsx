import { MessageDescriptor } from "../../types";

export type MessageField = {
  id: keyof MessageDescriptor;
  name: string;
  isActive: boolean;
};
export type MessageFieldsConfig = {
  fields: MessageField[];
};

export type FilePerRawValueConfig = {
  fileExtension: string;
};

export type Format =
  | {
      type: "json-message-per-entry";
    }
  | {
      type: "json-value-per-entry";
    }
  | {
      type: "json-file-per-value";
    }
  | {
      type: "file-per-raw-value";
    };

export type ExportConfig = {
  format: Format;
  fields: MessageFieldsConfig;
  filePerRawValueConfig: FilePerRawValueConfig;
};

export type ExportResultEntry = {
  fileName: string;
  content: string;
};
export type ExportResult = {
  entries: ExportResultEntry[];
};
