export type SessionState =
  | "paused"
  | "pausing"
  | "running"
  | "got-initial-cursor-positions"
  | "awaiting-initial-cursor-positions"
  | "initializing"
  | "new";

type RegexSubMode =
  | "all-topics"
  | "persistent-only"
  | "non-persistent-only";

export type ConsumerSessionTopicsSelector =
  | {
    type: "by-names";
    topics: string[];
  }
  | {
    type: "by-regex";
    pattern: string;
    regexSubscriptionMode: RegexSubMode;
  };

export type DateTimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';

export type RelativeDateTime = {
  value: number,
  unit: DateTimeUnit
  isRoundedToUnitStart: boolean
};

export type StartFrom =
  { type: "earliestMessage" } |
  { type: "latestMessage" } |
  { type: "messageId"; hexString: string } |
  { type: "dateTime"; dateTime: Date } |
  {
    type: "relativeDateTime",
    value: RelativeDateTime
  };

export type ConsumerSessionConfig = {
  startFrom: StartFrom;
  topicsSelector: ConsumerSessionTopicsSelector;
  messageFilterChain: MessageFilterChain;
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

  rawValue: Nullable<Uint8Array>;
  value: Nullable<string>; // JSON string
  accum: Nullable<string>; // JSON string
  index: number; // Not a part of Pulsar message.
  debugStdout: Nullable<string>; // Not a part of Pulsar message.
};

export type PartialMessageDescriptor = Partial<MessageDescriptor>;

export type JsMessageFilter = {
  jsCode: string;
};

export type BasicMessageFilterValue = {
  target: 'key' | 'value' | 'properties' | 'accum';
  value?: string;
  isCaseSensitive?: boolean;
};

export type BasicMessageFilterValueTarget = BasicMessageFilterValue['target'];

export type MessageFilter = {
  isEnabled: boolean;
  isNegated: boolean;
} & ({
  type: "js-message-filter";
  value: JsMessageFilter;
} |
  ({
    type: "basic-message-filter-contains";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-end-with";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-equals";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-greater-than";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-greater-than-or-equals";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-is-null";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-is-truthy";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-less-than";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-less-than-or-equals";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-regex";
    value: BasicMessageFilterValue;
  } | {
    type: "basic-message-filter-starts-with";
    value: BasicMessageFilterValue;
  }));

export type MessageFilterChainMode = 'all' | 'any';

export type MessageFilterChain = {
  isEnabled: boolean;
  isNegated: boolean;
  filters: MessageFilter[];
  mode: MessageFilterChainMode;
}

export type MessageFilterType = MessageFilter['type'];
