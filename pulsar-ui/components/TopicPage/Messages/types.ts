import { QuickDate } from "./SessionConfiguration/StartFromInput/quick-date";
import * as messageFilter from "../Messages/SessionConfiguration/MessageFilterInput/types";

export type SessionState =
  | "running"
  | "paused"
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

export type MessageDescriptor = {
  messageId: Uint8Array;
  value: Uint8Array;
  jsonValue: string;
  brokerPublishTime: Date | undefined;
  eventTime: Date | undefined;
  isReplicated: boolean;
  key: string;
  orderingKey: Uint8Array;
  producerName: string;
  properties: string;
  publishTime: Date | undefined;
  redeliveryCount: number;
  replicatedFrom: string;
  schemaVersion: number;
  sequenceId: number;
  size: number;
  topic: string;
  aggregate: string;
};
