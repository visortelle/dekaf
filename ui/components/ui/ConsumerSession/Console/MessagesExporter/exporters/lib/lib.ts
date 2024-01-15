import { MessageDescriptor, PartialMessageDescriptor } from "../../../../types";
import { MessageFieldsConfig } from "../../types";
import sizeof from "object-sizeof";

export function takeMessageFields(messages: MessageDescriptor[], fieldsConfig: MessageFieldsConfig): PartialMessageDescriptor[] {
  return messages.map((message) => {
    let partialMessage: PartialMessageDescriptor = {};

    fieldsConfig.fields.forEach((field) => {
      if (!field.isActive) {
        return;
      }

      (partialMessage[field.id] as any) = message[field.id];
    });

    return partialMessage;
  });
}

export type MessagesChunk = {
  messages: PartialMessageDescriptor[];
};

export function splitMessagesToChunks(messages: PartialMessageDescriptor[], maxBytesPerChunk: number): MessagesChunk[] {
  if (messages.length === 0) {
    return [];
  }

  if (messages.length === 1) {
    return [
      {
        messages,
      },
    ];
  }

  let chunks: MessagesChunk[] = [];
  let lastMessageIndex = 0;
  let fromIndex = 0;
  let toIndex = 0;
  let chunkSize = 0;

  messages.forEach((message, i) => {
    const messageSize = sizeof(message);

    const isChunkFilled = chunkSize !== 0 && chunkSize + messageSize > maxBytesPerChunk;

    if (isChunkFilled) {
      lastMessageIndex = i;

      const messagesToAdd = messages.slice(fromIndex, toIndex);
      chunks.push({
        messages: messagesToAdd,
      });

      fromIndex = i;
      toIndex = i;
      chunkSize = 0;
    }

    toIndex += 1;
    chunkSize += messageSize;
  });

  chunks.push({
    messages: messages.slice(lastMessageIndex),
  });

  return chunks;
}

export function encodeBigArrayAsJsonBytes<T>(arr: T[], toJson: (item: T) => string): Uint8Array {
  const textEncoder = new TextEncoder();

  if (arr.length === 0) {
    return textEncoder.encode("[]");
  }

  const serializedItems = arr.map<Uint8Array>((item) => {
    const serializedItem = toJson(item);
    return textEncoder.encode(serializedItem);
  });

  const bracketsCharsCount = 2; // '[' and ']'
  const commasCount = serializedItems.length - 1;
  const extraCharsCount = bracketsCharsCount + commasCount;
  const commaAsUint8Array = textEncoder.encode(",");
  const mergedArray = new Uint8Array(serializedItems.reduce((acc, cur) => acc + cur.length, extraCharsCount));

  let mergedLength = 0;

  mergedArray.set(textEncoder.encode("["), mergedLength);
  mergedLength += 1;

  serializedItems.forEach((uint8message, i) => {
    mergedArray.set(uint8message, mergedLength);
    mergedLength += uint8message.length;

    // Add comma, except for the last message.
    if (i !== serializedItems.length - 1) {
      mergedArray.set(commaAsUint8Array, mergedLength);
      mergedLength += 1;
      return;
    }
  });

  mergedArray.set(textEncoder.encode("]"), mergedLength);
  mergedLength += 1;

  return mergedArray;
}
