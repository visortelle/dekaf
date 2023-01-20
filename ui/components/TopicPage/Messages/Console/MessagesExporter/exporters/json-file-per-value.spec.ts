import { genMessageDescriptor } from "../../../testing";
import { MessageDescriptor } from "../../../types";
import { genExportConfig } from "../testing";
import { ExportConfig } from "../types";
import { genJsonFiles } from "./json-file-per-value";

describe("genJsonFiles", () => {
  it("generates .json files", async () => {
    const messageValue = JSON.stringify(
      Array.from({ length: 1024 * 10 }).map((_, i) => i)
    );
    const messages = Array.from({ length: 100 }).map((_, i) =>
      genMessageDescriptor({ index: i, value: messageValue })
    );

    const config: ExportConfig = genExportConfig();

    const got = genJsonFiles({ messages, config });
    expect(got.length).toEqual(messages.length);
    expect(got.every((file) => file.name.endsWith(".json"))).toBe(true);
    expect(got.every((file) => file.content.type === "application/json")).toBe(
      true
    );
    expect(got.every((file) => file.content.size < 1024 * 1024 * 100)).toBe(
      true
    );

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const file = got[i];
      const fileContent = await file.content.text();

      expect(fileContent).toEqual(message.value);
      expect(file.name).toEqual(`${message.index}.json`);
    }
  });

  it("drops messages with no value", async () => {
    const messages: MessageDescriptor[] = [
      genMessageDescriptor({ value: `""`, index: 1 }),
      genMessageDescriptor({ value: null, index: 2 }),
      genMessageDescriptor({ value: `"foo"`, index: 3 }),
    ];

    const config: ExportConfig = genExportConfig();

    const got = genJsonFiles({ messages, config });

    expect(got.length).toEqual(2);

    const message0Content = await got[0].content.text();
    expect(message0Content).toEqual(`""`);

    const message1Content = await got[1].content.text();
    expect(message1Content).toEqual(`"foo"`);
  });

  it("produces 0 files if no messages given", async () => {
    const messages: MessageDescriptor[] = [];
    const config: ExportConfig = genExportConfig();
    const got = genJsonFiles({ messages, config });

    expect(got).toEqual([]);
  });
});
