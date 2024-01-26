import { genMessageDescriptor } from "../../../testing";
import { MessageDescriptor } from "../../../types";
import { genExportConfig } from "../testing";
import { ExportConfig } from "../types";
import { genFiles } from "./file-per-raw-value";

describe("genFiles", () => {
  it("test1", async () => {
    const messageRawValue = Uint8Array.from(Array.from({ length: 1024 * 100 }).map((_, i) => i));

    const messages = Array.from({ length: 10 }).map((_, i) => genMessageDescriptor({ displayIndex: i, rawValue: messageRawValue }));

    const config: ExportConfig = genExportConfig();

    const got = genFiles({ messages, config });
    expect(got.length).toEqual(messages.length);
    expect(got.every((file) => file.content.type === "application/octet-stream")).toBe(true);

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const file = got[i];
      const fileContentArrayBuffer = await file.content.arrayBuffer();
      const fileContent = new Uint8Array(fileContentArrayBuffer);

      expect(fileContent).toEqual(message.rawValue);
    }
  });

  it("test2", async () => {
    const messages = [
      genMessageDescriptor({ rawValue: Uint8Array.from([0, 1, 2, 3]), displayIndex: 1 }),
      genMessageDescriptor({ rawValue: null, displayIndex: 2 }),
      genMessageDescriptor({ rawValue: Uint8Array.from([4, 5, 6, 7]), displayIndex: 3 }),
    ];

    const config: ExportConfig = genExportConfig();

    const got = genFiles({ messages, config });

    expect(got.length).toEqual(2);

    const message0ContentArrayBuffer = await got[0].content.arrayBuffer();
    const message0Content = new Uint8Array(message0ContentArrayBuffer);
    expect(message0Content).toEqual(Uint8Array.from([0, 1, 2, 3]));

    const message1ContentArrayBuffer = await got[1].content.arrayBuffer();
    const message1Content = new Uint8Array(message1ContentArrayBuffer);
    expect(message1Content).toEqual(Uint8Array.from([4, 5, 6, 7]));
  });

  it("all files have extension provided by user", async () => {
    const messages = Array.from({ length: 10 }).map((_, i) => genMessageDescriptor({ displayIndex: i }));

    const config1 = genExportConfig({ filePerRawValueConfig: { fileExtension: "foo" } });
    const files1 = genFiles({ messages, config: config1 });
    expect(files1.every((file, i) => file.name === `${i}.foo`)).toBe(true);

    const config2 = genExportConfig();
    const files2 = genFiles({ messages, config: config2 });
    expect(files2.every((file, i) => file.name === `${i}`)).toBe(true);

    const config3 = genExportConfig({ filePerRawValueConfig: { fileExtension: "" } });
    const files3 = genFiles({ messages, config: config3 });
    expect(files3.every((file, i) => file.name === i.toString())).toBe(true);
  });

  it("produces 0 files if no messages given", async () => {
    const messages: MessageDescriptor[] = [];
    const config: ExportConfig = genExportConfig();
    const got = genFiles({ messages, config });

    expect(got).toEqual([]);
  });
});
