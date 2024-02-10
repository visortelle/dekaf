import { MessageDescriptor } from "../../../../types";
import { ExportConfig } from "../types";
import { saveZipFile, File } from "./lib/files";

type GenFilesProps = {
  messages: MessageDescriptor[];
  config: ExportConfig;
};
export function genFiles(props: GenFilesProps): File[] {
  return props.messages
    .filter((msg) => msg.rawValue !== null)
    .map((msg) => ({
      name: `${msg.displayIndex}${
        props.config.filePerRawValueConfig.fileExtension === "" ? "" : `.${props.config.filePerRawValueConfig.fileExtension}`
      }`,
      content: new Blob([msg.rawValue || new Uint8Array(0)], {
        type: "application/octet-stream",
      }),
    }));
}

export type ExportMessagesProps = {
  messages: MessageDescriptor[];
  config: ExportConfig;
  exportName: string;
};

export function exportMessages(props: ExportMessagesProps) {
  const files = genFiles(props);
  saveZipFile(files, `${props.exportName}`);
}
