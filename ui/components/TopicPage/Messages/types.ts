import { QuickDate } from "./SessionConfiguration/StartFromInput/quick-date";
import * as messageFilter from "../Messages/SessionConfiguration/MessageFilterInput/types";

export type SessionState =
  | "paused"
  | "pausing"
  | "running"
  | "got-initial-cursor-positions"
  | "awaiting-initial-cursor-positions"
  | "initializing"
  | "new";

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
  messageFilter: messageFilter.Chain;
};

type Nullable<T> = T | null;
export type MessageDescriptor = {
  messageId: Nullable<Uint8Array>;
  eventTime: Nullable<number>;
  publishTime: Nullable<number>;
  brokerPublishTime: Nullable<number>;
  sequenceId: Nullable<number>;
  producerName: Nullable<string>;
  key: Nullable<string>;
  orderingKey: Nullable<Uint8Array>;
  topic: Nullable<string>;
  size: Nullable<number>;
  redeliveryCount: Nullable<number>;
  schemaVersion: Nullable<number>;
  isReplicated: Nullable<boolean>;
  replicatedFrom: Nullable<string>;
  properties: Record<string, string>;

  bytes: Nullable<Uint8Array>;
  value: Nullable<string>; // JSON string
  accum: Nullable<string>; // JSON string
  index: number; // Not a part of Pulsar message.
};
