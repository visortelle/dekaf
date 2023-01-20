import { MessageDescriptor } from "../../../types";
import { ExportConfig } from "../types";
import {
  serializeBigArray,
  splitMessagesToChunks,
  MessagesChunk,
} from "./lib/lib";
import { saveZipFile, File } from "./lib/files";

export type GenJsonFileProps = {
  chunk: MessagesChunk;
  config: ExportConfig;

  // In case there are no indexes in first and last messages in a chunk,
  // we can use this as a fallback for the file name.
  fileNameFallback: string;
};

export function genJsonFile(props: GenJsonFileProps): File {
  const messages = props.chunk.messages.filter(
    (msg) => msg.value !== null && msg.value !== undefined
  );

  const content = new Blob(
    [serializeBigArray(messages, (msg) => msg.value!)],
    {
      type: "application/json",
    }
  );

  let name = "";
  switch (props.chunk.messages.length) {
    case 0:
      name = "-.json";
      break;
    default:
      {
        const firstMessageIndex = props.chunk.messages[0].index;
        const lastMessageIndex =
          props.chunk.messages[props.chunk.messages.length - 1].index;
        const isUseFileNameFallback =
          firstMessageIndex === undefined || lastMessageIndex === undefined;

        name = isUseFileNameFallback
          ? props.fileNameFallback
          : `${props.chunk.messages[0].index}-${
              props.chunk.messages[props.chunk.messages.length - 1].index
            }.json`;
      }
      break;
  }

  return {
    content,
    name,
  };
}

type GenJsonFilesProps = {
  messages: MessageDescriptor[];
  config: ExportConfig;
};
export function genJsonFiles(props: GenJsonFilesProps): File[] {
  const maxChunkSize = 100 * 1024 * 1024;
  const messages = props.messages.map((msg) => ({ value: msg.value }));
  const chunks = splitMessagesToChunks(messages, maxChunkSize);

  return chunks.map((chunk, i) =>
    genJsonFile({
      chunk,
      config: props.config,
      fileNameFallback: `chunk-${i}.json`,
    })
  );
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
