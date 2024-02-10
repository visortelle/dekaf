import FileSaver from "file-saver";
import JsZip from 'jszip';

export function saveFile(blob: Blob, defaultName: string): void {
  FileSaver.saveAs(blob, defaultName);
}

export type File = {
  content: Blob,
  name: string,
}
export function zipFiles(inputFiles: File[], name: string): Promise<Blob> {
  const jszip = new JsZip();
  const folder = jszip.folder(name);

  inputFiles.forEach((file) => {
    folder?.file(file.name, file.content);
  });

  return jszip.generateAsync({ type: "blob" });
}

export function saveZipFile(inputFiles: File[], name: string): void {
  zipFiles(inputFiles, name).then((blob) => {
    saveFile(blob, `${name}.zip`);
  });
}
