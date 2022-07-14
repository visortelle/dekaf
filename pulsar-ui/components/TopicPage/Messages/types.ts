import { StartFrom } from "./StartFromInput/StartFromInput";

export type SessionState =
  | "running"
  | "paused"
  | "initializing"
  | "new";

export type SessionConfig = {
  startFrom: StartFrom;
}

