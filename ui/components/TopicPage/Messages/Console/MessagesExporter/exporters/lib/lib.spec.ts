import {
  genEmptyMessageDescriptor,
  genMessageDescriptor,
} from "../../../../testing";
import { genMessageFieldsConfig } from "../../testing";
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
        genMessageDescriptor()
      );
      const config: MessageFieldsConfig = genMessageFieldsConfig();
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
  const bytesInMb = 1024 * 1024;
  const oneMbArray = Array.from({ length: bytesInMb }).map(() => 42);
  const oneMbString = oneMbArray.join("");

  const dataset: {
    messages: MessageDescriptor[];
    maxBytesPerChunk: number;
    expectedChunksCount?: number;
  }[] = [
    {
      messages: [],
      maxBytesPerChunk: 1024 * 4,
      expectedChunksCount: 0,
    },
    {
      messages: [genMessageDescriptor()],
      maxBytesPerChunk: 1024 * 4,
      expectedChunksCount: 1,
    },
    {
      messages: [
        genMessageDescriptor({
          value: oneMbString,
          bytes: Uint8Array.from([]),
          index: 1, // Message index starts from 1, as user sees it on UI.
        }),
      ],
      maxBytesPerChunk: 1024 * 4,
      expectedChunksCount: 1,
    },
    {
      messages: [genEmptyMessageDescriptor({ index: 1 }), genEmptyMessageDescriptor({ index: 2 })],
      maxBytesPerChunk: 1024,
      expectedChunksCount: 1,
    },
    {
      messages: [
        genMessageDescriptor({
          value: oneMbString,
          bytes: Uint8Array.from([]),
          index: 1, // Message index starts from 1, as user sees it on UI.
        }),
        genMessageDescriptor({
          value: oneMbString,
          bytes: Uint8Array.from([]),
          index: 1, // Message index starts from 1, as user sees it on UI.
        }),
      ],
      maxBytesPerChunk: 1024,
      expectedChunksCount: 2,
    },

    {
      messages: [genMessageDescriptor(), genMessageDescriptor(), genMessageDescriptor()],
      maxBytesPerChunk: 1024,
    },
    {
      messages: [genMessageDescriptor(), genMessageDescriptor(), genMessageDescriptor(), genMessageDescriptor()],
      maxBytesPerChunk: 1024,
    },
    {
      // Each message size is about 2MB + metadata.
      messages: Array.from({ length: 100 }).map((_, i) =>
        genMessageDescriptor({
          value: oneMbString,
          bytes: Uint8Array.from([]),
          index: i + 1, // Message index starts from 1, as user sees it on UI.
        })
      ),
      maxBytesPerChunk: 16 * bytesInMb,
    },
  ];

  it.each(dataset)(
    `split messages to chunks, limited by chunk size in bytes`,
    ({ messages, maxBytesPerChunk, expectedChunksCount }) => {
      const bytesInMessages = sizeof(messages); // Approximately.

      const chunks = splitMessagesToChunks(messages, maxBytesPerChunk);

      // Messages in chunks are the same as input.
      const messagesInChunks = chunks.reduce<MessageDescriptor[]>(
        (acc, chunk) => acc.concat(chunk.messages),
        []
      );
      expect(messagesInChunks).toEqual(messages);

      // Check that there are enough chunks. We can't rely on the exact count,
      // because we can't 100% rely on the message size calculations.
      let expectedMinChunksCount = Math.ceil(
        bytesInMessages / maxBytesPerChunk
      );
      if (messages.length < expectedMinChunksCount) {
        expectedMinChunksCount = messages.length;
      }
      expect(chunks.length).toBeGreaterThanOrEqual(expectedMinChunksCount);

      if (expectedChunksCount !== undefined) {
        expect(chunks.length).toBe(expectedChunksCount);
      }

      // Check message indexes for each chunk.
      chunks.forEach((chunk) => {
        expect(chunk.messages[0].index).toBe(chunk.from);
        expect(chunk.messages[chunk.messages.length - 1].index).toBe(chunk.to);
      });
    }
  );
});
