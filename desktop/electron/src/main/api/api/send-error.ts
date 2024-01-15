import { ErrorHappened } from "./types";
import { apiChannel } from "../../channels";

export function sendError(event: Electron.IpcMainEvent, message: string) {
  const req: ErrorHappened = {
    type: "ErrorHappened",
    message
  }

  event.reply(apiChannel, req);
}
