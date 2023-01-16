import { MessageDescriptor, PartialMessageDescriptor } from "../../../../types";
import { MessageFieldsConfig } from "../../types";
import sizeof from "object-sizeof";

export function takeMessageFields(
  messages: MessageDescriptor[],
  fieldsConfig: MessageFieldsConfig
): PartialMessageDescriptor[] {
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
  // Indexed from 1, to use same index as user sees on the UI.
  from: number;
  // Indexed from 1, to use same index as user sees on the UI.
  to: number;
  messages: MessageDescriptor[];
};

export function splitMessagesToChunks(
  messages: MessageDescriptor[],
  maxBytesPerChunk: number
): MessagesChunk[] {
  if (messages.length === 0) {
    return [];
  }

  if (messages.length === 1) {
    return [
      {
        from: messages[0].index,
        to: messages[0].index,
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

    const isChunkFilled =
      chunkSize !== 0 && chunkSize + messageSize > maxBytesPerChunk;

    if (isChunkFilled) {
      lastMessageIndex = i;

      const messagesToAdd = messages.slice(fromIndex, toIndex);
      chunks.push({
        from: messagesToAdd[0].index,
        to: messagesToAdd[messagesToAdd.length - 1].index,
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
    from: messages[lastMessageIndex].index,
    to: messages[messages.length - 1].index,
    messages: messages.slice(lastMessageIndex),
  });

  return chunks;
}

export function serializeBigArray<T>(arr: T[]): Uint8Array {
  const textEncoder = new TextEncoder();

  if (arr.length === 0) {
    return textEncoder.encode("[]");
  }

  const serializedItems = arr.map<Uint8Array>((message) => {
    const serializedMessage = JSON.stringify(message);
    return textEncoder.encode(serializedMessage);
  });

  const bracketsCharsCount = 2; // '[' and ']'
  const commasCount = serializedItems.length - 1;
  const extraCharsCount = bracketsCharsCount + commasCount;
  const commaAsUint8Array = textEncoder.encode(",");
  const mergedArray = new Uint8Array(
    serializedItems.reduce((acc, cur) => acc + cur.length, extraCharsCount)
  );

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
