import { ManagedConsumerSessionConfigValOrRef, ManagedConsumerSessionStartFrom, ManagedConsumerSessionStartFromValOrRef, ManagedDateTimeValOrRef, ManagedMessageFilterChainValOrRef, ManagedMessageFilterValOrRef, ManagedMessageIdValOrRef, ManagedRelativeDateTime, ManagedRelativeDateTimeValOrRef, ManagedTopicSelectorValOrRef } from "./user-managed-items";
import { ConsumerSessionConfig, ConsumerSessionStartFrom, MessageFilter, MessageFilterChain, RelativeDateTime } from "../../../TopicPage/Messages/types";
import { TopicSelector, RegexSubMode } from "../../../TopicPage/Messages/topic-selector/topic-selector";

export function messageFilterFromValOrRef(v: ManagedMessageFilterValOrRef): MessageFilter {
  if (v.val === undefined) {
    throw new Error('MessageFilter reference can\'t be converted to value');
  }

  return v.val.spec;
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

export function topicsSelectorFromValOrRef(v: ManagedTopicSelectorValOrRef[], currentTopicFqn: string | undefined): TopicSelector {
  if (v.some(ts => ts.val === undefined)) {
    throw new Error('TopicsSelector reference can\'t be converted to value');
  }

  // by-fqns and by-regex topics selectors can't be mixed together because Pulsar consumer doesn't support it.
  let topicSelectorType: TopicSelector['type'] = 'multi-topic-selector';
  if (v.every(ts => ts.val?.spec.topicSelector.type === 'by-fqns' || ts.val?.spec.topicSelector.type === 'current-topic')) {
    topicSelectorType = 'by-fqns';
  } else if (v.every(ts => ts.val?.spec.topicSelector.type === 'by-regex')) {
    topicSelectorType = 'by-regex';
  }

  if (topicSelectorType === 'by-fqns') {
    const topicFqns = v.map(ts => {
      if (ts.val?.spec.topicSelector.type === 'by-fqns') {
        return ts.val.spec.topicSelector.topicFqns;
      } else if (ts.val?.spec.topicSelector.type === 'current-topic' && currentTopicFqn !== undefined) {
        return [currentTopicFqn];
      }

      return [];
    }).flat();

    return {
      type: 'by-fqns',
      topicFqns
    }
  } else if (topicSelectorType === 'by-regex') {
    const patterns = v.map(ts => {
      if (ts.val?.spec.topicSelector.type === 'by-regex') {
        return ts.val.spec.topicSelector.pattern;
      }

      return [];
    }).flat();

    const regexSubscriptionMode: RegexSubMode = v[0].val?.spec.topicSelector.type === 'by-regex' ?
      v[0].val?.spec.topicSelector.regexSubscriptionMode :
      'all-topics';

    return {
      type: 'by-regex',
      pattern: patterns.join('|'),
      regexSubscriptionMode
    }
  }

  throw new Error('TopicsSelector reference can\'t be converted to value');
}

export function consumerSessionConfigFromValOrRef(v: ManagedConsumerSessionConfigValOrRef, currentTopicFqn: string | undefined): ConsumerSessionConfig {
  if (v.val === undefined) {
    throw new Error('Consumer session config reference can\'t be converted to value');
  }

  return {
    startFrom: consumerSessionStartFromFromValOrRef(v.val.spec.startFrom),
    messageFilterChain: messageFilterChainFromValOrRef(v.val.spec.messageFilterChain),
    topicsSelector: topicsSelectorFromValOrRef(v.val.spec.topicsSelectors, currentTopicFqn)
  }
}
