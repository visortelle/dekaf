import { MessageDescriptor } from "../../../types";
import { ExportConfig } from "../types";
import {
  takeMessageFields,
  serializeBigArray,
  splitMessagesToChunks,
  MessagesChunk,
} from "./lib/lib";
import { saveZipFile, File } from "./lib/files";

type GenJsonFileProps = {
  chunk: MessagesChunk;
  config: ExportConfig;
};

export function genJsonFile(props: GenJsonFileProps): File {
  const messages = takeMessageFields(props.chunk.messages, props.config.fields);
  const content = new Blob([serializeBigArray(messages)], {
    type: "application/json",
  });

  let name = '';
  switch(props.chunk.messages.length) {
    case 0: name = '-.json'; break;
    case 1: name = `${props.chunk.from + 1}.json`; break;
    default: name = `${props.chunk.from + 1}-${props.chunk.to}.json`; break;
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
  const chunks = splitMessagesToChunks(props.messages, maxChunkSize);
  return chunks.map((chunk) => genJsonFile({ chunk, config: props.config }));
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
