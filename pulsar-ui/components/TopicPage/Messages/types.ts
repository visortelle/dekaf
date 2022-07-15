import { QuickDate } from "./SessionConfiguration/StartFromInput/quick-date";

export type SessionState = "running" | "paused" | "initializing" | "new";

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
  | { type: "earliest", skip: number }
  | { type: "latest" };

export type SessionConfig = {
  startFrom: StartFrom;
  topicsSelector: SessionTopicsSelector;
};
