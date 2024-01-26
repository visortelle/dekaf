import { MessageDescriptor } from "../../../types";
import { ExportConfig } from "../types";
import { takeMessageFields, encodeBigArrayAsJsonBytes, splitMessagesToChunks, MessagesChunk } from "./lib/lib";
import { saveZipFile, File } from "./lib/files";
import { partialMessageDescriptorToSerializable } from "../../../conversions/conversions";

export type GenFileProps = {
  chunk: MessagesChunk;
  config: ExportConfig;

  // In case there are no indexes in first and last messages in a chunk,
  // we can use this as a fallback for the file name.
  fileNameFallback: string;
};

export function genFile(props: GenFileProps): File {
  const content = new Blob(
    [encodeBigArrayAsJsonBytes(props.chunk.messages, (msg) => JSON.stringify(partialMessageDescriptorToSerializable(msg)))],
    {
      type: "application/json",
    },
  );

  let name = "";
  switch (props.chunk.messages.length) {
    case 0:
      name = "-.json";
      break;
    default: {
      const firstMessageIndex = props.chunk.messages[0].displayIndex;
      const lastMessageIndex = props.chunk.messages[props.chunk.messages.length - 1].displayIndex;
      const isUseFileNameFallback = firstMessageIndex === undefined || lastMessageIndex === undefined;

      name = isUseFileNameFallback
        ? props.fileNameFallback
        : `${props.chunk.messages[0].displayIndex}-${props.chunk.messages[props.chunk.messages.length - 1].displayIndex}.json`;
    }
      break;
  }

  return {
    content,
    name,
  };
}

type GenFilesProps = {
  messages: MessageDescriptor[];
  config: ExportConfig;
};
export function genFiles(props: GenFilesProps): File[] {
  const maxChunkSize = 100 * 1024 * 1024;
  const messages = takeMessageFields(props.messages, props.config.fields);
  const chunks = splitMessagesToChunks(messages, maxChunkSize);

  return chunks.map((chunk, i) =>
    genFile({
      chunk,
      config: props.config,
      fileNameFallback: `chunk-${i}.json`,
    }),
  );
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
