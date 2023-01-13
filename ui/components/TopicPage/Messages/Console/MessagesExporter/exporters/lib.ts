import { MessageDescriptor, PartialMessageDescriptor } from "../../../types";
import { MessageFieldsConfig } from "../types";

export function takeMessageFields(
  messages: MessageDescriptor[],
  config: MessageFieldsConfig
): PartialMessageDescriptor[] {
  return messages.map((message) => {
    let partialMessage: PartialMessageDescriptor = {};

    config.fields.forEach((field) => {
      if (!field.isActive) {
        return;
      }

      (partialMessage[field.id] as any) = message[field.id];
    });

    return partialMessage;
  });
}
