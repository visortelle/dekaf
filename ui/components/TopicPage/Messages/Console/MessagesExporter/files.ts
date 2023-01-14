import FileSaver from "file-saver";

export function saveFile(blob: Blob, defaultName: string): void {
  FileSaver.saveAs(blob, defaultName);
}
