import { QuickDate } from "./SessionConfiguration/StartFromInput/quick-date";

export type SessionState = "running" | "paused" | "got-initial-cursor-positions" | "awaiting-initial-cursor-positions" | "initializing" | "new";

type RegexSubMode =
  | "unspecified"
  | "all-topics"
  | "persistent-only"
  | "non-persistent-only";

export type SessionTopicsSelector =
  | {
      type: "by-names";
      topics: string[];
    }
  | {
      type: "by-regex";
      pattern: string;
      regexSubscriptionMode: RegexSubMode;
    };

export type StartFrom =
  | { type: "date"; date: Date }
  | { type: "quickDate"; quickDate: QuickDate; relativeTo: Date }
  | { type: "timestamp"; ts: string }
  | { type: "messageId"; hexString: string }
  | { type: "earliest" }
  | { type: "latest" };

export type SessionConfig = {
  startFrom: StartFrom;
  topicsSelector: SessionTopicsSelector;
};
