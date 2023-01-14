import { MessageDescriptor, PartialMessageDescriptor } from "../../../types";
import { MessageFieldsConfig } from "../types";

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
