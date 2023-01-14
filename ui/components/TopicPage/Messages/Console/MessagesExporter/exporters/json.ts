import { MessageDescriptor } from "../../../types";
import { ExportConfig } from "../types";
import { takeMessageFields } from "./lib";

type GetJsonFileContentProps = {
  messages: MessageDescriptor[];
  config: ExportConfig;
};

export function genJsonFileContent(props: GetJsonFileContentProps): Uint8Array {
  const messages = takeMessageFields(props.messages, props.config.fields);
  return serializeBigArray(messages);
}

export function serializeBigArray<T>(arr: T[]): Uint8Array {
  const textEncoder = new TextEncoder();

  if (arr.length === 0) {
    return textEncoder.encode("[]");
  }

  const uint8messages = arr.map<Uint8Array>((message) => {
    const serializedMessage = JSON.stringify(message);
    return textEncoder.encode(serializedMessage);
  });

  const bracketsCharsCount = 2; // '[' and ']'
  const commasCount = uint8messages.length - 1;
  const extraCharsCount = bracketsCharsCount + commasCount;
  const commaAsUint8Array = textEncoder.encode(",");
  const mergedArray = new Uint8Array(
    uint8messages.reduce((acc, cur) => acc + cur.length, extraCharsCount)
  );

  let mergedLength = 0;

  mergedArray.set(textEncoder.encode("["), mergedLength);
  mergedLength += 1;

  uint8messages.forEach((uint8message, i) => {
    mergedArray.set(uint8message, mergedLength);
    mergedLength += uint8message.length;

    // Add comma, except for the last message.
    if (i !== uint8messages.length - 1) {
      mergedArray.set(commaAsUint8Array, mergedLength);
      mergedLength += 1;
      return;
    }
  });

  mergedArray.set(textEncoder.encode("]"), mergedLength);
  mergedLength += 1;

  return mergedArray;
}
