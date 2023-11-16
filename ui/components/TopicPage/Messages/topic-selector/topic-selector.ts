export type RegexSubMode =
  | "all-topics"
  | "persistent-only"
  | "non-persistent-only";

export type MultiTopicSelector = {
  type: "multi-topic-selector";
  topicFqns: string[];
};

export type NamespacedRegexTopicSelector = {
  type: "namespaced-regex-topic-selector";
  namespaceFqn: string;
  pattern: string;
  regexSubscriptionMode: RegexSubMode;
}

export type TopicSelector = MultiTopicSelector | NamespacedRegexTopicSelector;

