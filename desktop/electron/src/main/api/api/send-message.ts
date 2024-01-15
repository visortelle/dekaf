import { webContents } from "electron";

export function sendMessage(channel: string, ...args: any[]): void {
  webContents.getAllWebContents().forEach(wc => wc.send(channel, ...args));
}

