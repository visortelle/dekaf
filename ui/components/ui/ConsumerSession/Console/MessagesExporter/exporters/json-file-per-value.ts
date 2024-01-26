import { MessageDescriptor } from "../../../types";
import { ExportConfig } from "../types";
import { saveZipFile, File } from "./lib/files";

type GenFilesProps = {
  messages: MessageDescriptor[];
  config: ExportConfig;
};
export function genFiles(props: GenFilesProps): File[] {
  return props.messages
    .filter((msg) => msg.value !== null && msg.value !== undefined)
    .map((msg) => ({
      name: `${msg.displayIndex}.json`,
      content: new Blob([msg.value!], {
        type: "application/json",
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
