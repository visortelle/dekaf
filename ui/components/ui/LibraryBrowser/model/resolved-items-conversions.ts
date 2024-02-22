import { ManagedBasicMessageFilterTargetValOrRef, ManagedColoringRuleChainValOrRef, ManagedColoringRuleValOrRef, ManagedConsumerSessionConfigValOrRef, ManagedConsumerSessionEventValOrRef, ManagedConsumerSessionPauseTriggerChainValOrRef, ManagedConsumerSessionStartFromValOrRef, ManagedConsumerSessionTargetValOrRef, ManagedDateTimeValOrRef, ManagedDeserializerValOrRef, ManagedMessageFilterChainValOrRef, ManagedMessageFilterValOrRef, ManagedMessageIdValOrRef, ManagedRelativeDateTimeValOrRef, ManagedTopicSelectorSpec, ManagedTopicSelectorValOrRef, ManagedValueProjectionListValOrRef, ManagedValueProjectionValOrRef } from "./user-managed-items";
import { ColoringRule, ColoringRuleChain, ConsumerSessionConfig, ConsumerSessionEvent, ConsumerSessionPauseTriggerChain, ConsumerSessionStartFrom, ConsumerSessionTarget, MessageFilter, MessageFilterChain, RelativeDateTime } from "../../ConsumerSession/types";
import { TopicSelector } from "../../ConsumerSession/topic-selector/topic-selector";
import { BasicMessageFilterTarget } from "../../ConsumerSession/basic-message-filter-types";
import { ValueProjection, ValueProjectionList } from "../../ConsumerSession/value-projections/value-projections";
import { Deserializer } from "../../ConsumerSession/deserializer/deserializer";
import { defaultNumDisplayItems } from "../../ConsumerSession/SessionConfiguration/SessionConfiguration";

export function messageFilterFromValOrRef(v: ManagedMessageFilterValOrRef): MessageFilter {
  if (v.val === undefined) {
    throw new Error('MessageFilter reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return {
    type: "MessageFilter",
    isEnabled: spec.isEnabled,
    isNegated: spec.isNegated,
    targetField: basicMessageFilterTargetValueFromValOrRef(spec.targetField),
    filter: spec.filter,
  };
}

export function basicMessageFilterTargetValueFromValOrRef(v: ManagedBasicMessageFilterTargetValOrRef): BasicMessageFilterTarget {
  if (v.val === undefined) {
    throw new Error('BasicMessageFilterTarget reference can\'t be converted to value');
  }

  return v.val.spec.target;
}

export function valueProjectionFromValOrRef(v: ManagedValueProjectionValOrRef): ValueProjection {
  if (v.val === undefined) {
    throw new Error('ValueProjection reference can\'t be converted to value');
  }

  return {
    isEnabled: v.val.spec.isEnabled,
    target: basicMessageFilterTargetValueFromValOrRef(v.val.spec.target),
    shortName: v.val.spec.shortName,
    width: v.val.spec.width
  };
}

export function valueProjectionListFromValOrRef(v: ManagedValueProjectionListValOrRef): ValueProjectionList {
  if (v.val === undefined) {
    throw new Error('ValueProjectionList reference can\'t be converted to value');
  }

  return {
    isEnabled: v.val.spec.isEnabled,
    projections: v.val.spec.projections.map(valueProjectionFromValOrRef)
  };
}

export function messageFilterChainFromValOrRef(v: ManagedMessageFilterChainValOrRef): MessageFilterChain {
  if (v.val === undefined) {
    throw new Error('MessageFilterChain reference can\'t be converted to value');
  }

  return {
    isEnabled: v.val.spec.isEnabled,
    isNegated: v.val.spec.isNegated,
    filters: v.val.spec.filters.map(messageFilterFromValOrRef),
    mode: v.val.spec.mode
  }
}

export function messageIdFromValOrRef(v: ManagedMessageIdValOrRef): string {
  if (v.val === undefined) {
    throw new Error('MessageId reference can\'t be value');
  }

  return v.val.spec.hexString;
}

export function dateTimeFromValOrRef(v: ManagedDateTimeValOrRef): Date {
  if (v.val === undefined) {
    throw new Error('DateTime reference can\'t be converted to value');
  }

  return v.val.spec.dateTime;
}

export function relativeDateTimeFromValOrRef(v: ManagedRelativeDateTimeValOrRef): RelativeDateTime {
  if (v.val === undefined) {
    throw new Error('RelativeDateTime reference can\'t be converted to value');
  }

  return v.val.spec;
}

export function consumerSessionStartFromFromValOrRef(v: ManagedConsumerSessionStartFromValOrRef): ConsumerSessionStartFrom {
  if (v.val === undefined) {
    throw new Error('ConsumerSessionStartFrom reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  switch (spec.startFrom.type) {
    case 'earliestMessage': return { type: 'earliestMessage' };
    case 'latestMessage': return { type: 'latestMessage' };
    case 'nthMessageAfterEarliest': return { type: 'nthMessageAfterEarliest', n: spec.startFrom.n };
    case 'nthMessageBeforeLatest': return { type: 'nthMessageBeforeLatest', n: spec.startFrom.n };
    case 'dateTime': return {
      type: 'dateTime',
      dateTime: dateTimeFromValOrRef(spec.startFrom.dateTime)
    };
    case 'messageId': return {
      type: 'messageId',
      hexString: messageIdFromValOrRef(spec.startFrom.messageId)
    };
    case 'relativeDateTime': return {
      type: 'relativeDateTime',
      relativeDateTime: relativeDateTimeFromValOrRef(spec.startFrom.relativeDateTime)
    }
  }
}

export function topicSelectorFromManagedSpec(spec: ManagedTopicSelectorSpec, currentTopicFqn?: string): TopicSelector {
  const topicSelector = spec.topicSelector;

  if (topicSelector.type === 'current-topic') {
    if (currentTopicFqn === undefined) {
      return { type: 'multi-topic-selector', topicFqns: [] };
    }

    return { type: 'multi-topic-selector', topicFqns: [currentTopicFqn] };
  }

  return topicSelector;
}

export function topicSelectorFromValOrRef(v: ManagedTopicSelectorValOrRef, currentTopicFqn?: string): TopicSelector {
  if (v.val === undefined) {
    throw new Error('TopicSelector reference can\'t be converted to value');
  }

  return topicSelectorFromManagedSpec(v.val.spec, currentTopicFqn);
}

export function coloringRuleFromValOrRef(v: ManagedColoringRuleValOrRef): ColoringRule {
  if (v.val === undefined) {
    throw new Error('Coloring rule reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return {
    isEnabled: spec.isEnabled,
    messageFilterChain: messageFilterChainFromValOrRef(spec.messageFilterChain),
    foregroundColor: spec.foregroundColor,
    backgroundColor: spec.backgroundColor
  }
}

export function coloringRuleChainFromValOrRef(v: ManagedColoringRuleChainValOrRef): ColoringRuleChain {
  if (v.val === undefined) {
    throw new Error('Coloring rule chain reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return {
    isEnabled: spec.isEnabled,
    coloringRules: spec.coloringRules.map(coloringRuleFromValOrRef)
  }
}

export function consumerSessionTargetFromValOrRef(v: ManagedConsumerSessionTargetValOrRef, currentTopicFqn: string | undefined): ConsumerSessionTarget {
  if (v.val === undefined) {
    throw new Error('Consumer session topic reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return {
    isEnabled: spec.isEnabled,
    consumptionMode: spec.consumptionMode,
    messageValueDeserializer: deserializerFromValOrRef(spec.messageValueDeserializer),
    topicSelector: topicSelectorFromValOrRef(spec.topicSelector, currentTopicFqn),
    coloringRuleChain: coloringRuleChainFromValOrRef(spec.coloringRuleChain),
    messageFilterChain: messageFilterChainFromValOrRef(spec.messageFilterChain),
    valueProjectionList: valueProjectionListFromValOrRef(spec.valueProjectionList)
  }
}

export function consumerSessionEventFromValOrRef(v: ManagedConsumerSessionEventValOrRef): ConsumerSessionEvent {
  if (v.val === undefined) {
    throw new Error('Consumer session event reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return spec.event;
}

export function consumerSessionPauseTriggerChainFromValOrRef(v: ManagedConsumerSessionPauseTriggerChainValOrRef): ConsumerSessionPauseTriggerChain {
  if (v.val === undefined) {
    throw new Error('Consumer session pause trigger chain reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return {
    events: spec.events.map(consumerSessionEventFromValOrRef),
    mode: spec.mode
  }
}

export function consumerSessionConfigFromValOrRef(v: ManagedConsumerSessionConfigValOrRef, currentTopicFqn: string | undefined): ConsumerSessionConfig {
  if (v.val === undefined) {
    throw new Error('Consumer session reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return {
    startFrom: consumerSessionStartFromFromValOrRef(spec.startFrom),
    messageFilterChain: messageFilterChainFromValOrRef(spec.messageFilterChain),
    targets: spec.targets.map(spec => consumerSessionTargetFromValOrRef(spec, currentTopicFqn)),
    coloringRuleChain: coloringRuleChainFromValOrRef(spec.coloringRuleChain),
    pauseTriggerChain: consumerSessionPauseTriggerChainFromValOrRef(spec.pauseTriggerChain),
    valueProjectionList: valueProjectionListFromValOrRef(spec.valueProjectionList),
    numDisplayItems: spec.numDisplayItems === undefined ? defaultNumDisplayItems : spec.numDisplayItems
  }
}

export function deserializerFromValOrRef(v: ManagedDeserializerValOrRef): Deserializer {
  if (v.val === undefined) {
    throw new Error('Deserializer reference can\'t be converted to value');
  }

  const spec = v.val.spec;

  return spec.deserializer;
}
