import { randMessageDescriptor } from "../../../../testing";
import { randMessageFieldsConfig } from "../../testing";
import { MessageDescriptor } from "../../../../types";
import { MessageFieldsConfig } from "../../types";
import {
  takeMessageFields,
  splitMessagesToChunks,
  serializeBigArray,
} from "./lib";
import sizeof from "object-sizeof";

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

describe("serializeBigArray", () => {
  it("serialize array of objects as minified JSON", () => {
    const got = serializeBigArray([
      { name: "John", age: 42 },
      { name: "Jane", age: 42 },
    ]);

    expect(new TextDecoder().decode(got)).toBe(
      '[{"name":"John","age":42},{"name":"Jane","age":42}]'
    );
  });

  it("handle big arrays", () => {
    const bytesInKb = 1024;
    const megabytesCount = 256;

    const bigArray = Array.from({ length: megabytesCount * bytesInKb }).map(
      () => ({
        numbers: Array.from({ length: bytesInKb }).map(() => 42),
      })
    );

    const got = serializeBigArray(bigArray);
    expect(got.length).toBeGreaterThanOrEqual(megabytesCount * bytesInKb);
  });

  it("return [] if no data to serialize", () => {
    const got = serializeBigArray([]);
    expect(new TextDecoder().decode(got)).toBe("[]");
  });
});

describe("splitMessagesToChunks", () => {
  it("split messages to chunks, limited by chunk size in bytes", () => {
    const bytesInMb = 1024 * 1024;

    const oneMbArray = Array.from({ length: bytesInMb }).map(() => 42);
    const oneMbString = oneMbArray.join("");

    // Each message size is about 2MB + metadata.
    const messages = Array.from({ length: 100 }).map((_, i) =>
      randMessageDescriptor({
        value: oneMbString,
        bytes: Uint8Array.from([]),
        index: i + 1, // Message index starts from 1, as user sees it on UI.
      })
    );

    const approxMessagesSize = sizeof(messages);

    const maxChunkSize = 16 * bytesInMb;
    const chunks = splitMessagesToChunks(messages, maxChunkSize);

    // Check that first chunk starts from 1 and last chunk ends with last message.
    expect(chunks[0].from).toBe(1);
    expect(chunks[chunks.length - 1].to).toBe(messages.length);

    // Check that all messages are in chunks.
    const messagesCountInChunks = chunks.reduce(
      (acc, chunk) => acc + chunk.messages.length,
      0
    );
    expect(messagesCountInChunks).toBe(messages.length);

    // Messages in chunks are the same as in input.
    const messagesInChunks = chunks.reduce<MessageDescriptor[]>(
      (acc, chunk) => acc.concat(chunk.messages),
      []
    );
    expect(messagesInChunks).toEqual(messages);

    // Check that there are enough chunks. We can't rely on the exact count,
    // because we can't 100% rely on the message size calculations.
    const expectedMinChunksCount = Math.ceil(approxMessagesSize / maxChunkSize);
    expect(chunks.length).toBeGreaterThanOrEqual(expectedMinChunksCount);

    // Check message indexes for each chunk.
    chunks.forEach((chunk, i) => {
      expect(chunk.messages[0].index).toBe(chunk.from);
      expect(chunk.messages[chunk.messages.length - 1].index).toBe(chunk.to);
    });
  });
});
