import { MessageDescriptor } from "../../../types";
import { ExportConfig } from "../types";
import { takeMessageFields } from "./lib/lib";
import { saveZipFile, File } from "./lib/files";

type GenJsonFilesProps = {
  messages: MessageDescriptor[];
  config: ExportConfig;
};
export function genJsonFiles(props: GenJsonFilesProps): File[] {
  const messages = takeMessageFields(props.messages, props.config.fields);

  return messages
    .filter((msg) => msg.value !== null && msg.value !== undefined)
    .map((msg) => ({
      name: `${msg.index}.json`,
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
  const files = genJsonFiles(props);
  saveZipFile(files, `${props.exportName}`);
}
