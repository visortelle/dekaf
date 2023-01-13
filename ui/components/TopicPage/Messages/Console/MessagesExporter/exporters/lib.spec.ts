import { randMessageDescriptor } from "../../../testing";
import { randMessageFieldsConfig } from "../testing";
import { MessageDescriptor } from "../../../types";
import { MessageFieldsConfig } from "../types";
import { takeMessageFields } from "./lib";

describe("takeMessageFields", () => {
  it("should take only fields marked as 'active'", () => {
    Array.from(Array(20)).forEach(() => {
      const messages: MessageDescriptor[] = Array.from(Array(10)).map(() =>
        randMessageDescriptor()
      );
      const config: MessageFieldsConfig = randMessageFieldsConfig();
      const got = takeMessageFields(messages, config);

      const want = messages.map((message) => {
        const fieldKeysToTake = config.fields
          .filter((field) => field.isActive)
          .map<keyof MessageDescriptor>((field) => field.id);

        return fieldKeysToTake.reduce<Partial<MessageDescriptor>>(
          (acc, fieldKey) => {
            (acc[fieldKey] as any) = message[fieldKey];
            return acc;
          },
          {} as Partial<MessageDescriptor>
        );
      });

      expect(got).toEqual(want);
    });
  });
});
