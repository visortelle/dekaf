import { UserManagedConsumerSessionConfigValueOrReference, UserManagedConsumerSessionStartFrom, UserManagedConsumerSessionStartFromValueOrReference, UserManagedDateTimeValueOrReference, UserManagedMessageFilterChainValueOrReference, UserManagedMessageFilterValueOrReference, UserManagedMessageIdValueOrReference, UserManagedRelativeDateTime, UserManagedRelativeDateTimeValueOrReference } from "./user-managed-items";
import { ConsumerSessionConfig, ConsumerSessionStartFrom, MessageFilter, MessageFilterChain, RelativeDateTime } from "../../../TopicPage/Messages/types";

export function messageFilterFromValueOrReference(v: UserManagedMessageFilterValueOrReference): MessageFilter {
  if (v.value === undefined) {
    throw new Error('MessageFilter reference can\'t be converted to value');
  }

  return v.value.spec;
}

export function messageFilterChainFromValueOrReference(v: UserManagedMessageFilterChainValueOrReference): MessageFilterChain {
  if (v.value === undefined) {
    throw new Error('MessageFilterChain reference can\'t be converted to value');
  }

  return {
    isEnabled: v.value.spec.isEnabled,
    isNegated: v.value.spec.isNegated,
    filters: v.value.spec.filters.map(messageFilterFromValueOrReference),
    mode: v.value.spec.mode
  }
}

export function messageIdFromValueOrReference(v: UserManagedMessageIdValueOrReference): string {
  if (v.value === undefined) {
    throw new Error('MessageId reference can\'t be value');
  }

  return v.value.spec.hexString;
}

export function dateTimeFromValueOrReference(v: UserManagedDateTimeValueOrReference): Date {
  if (v.value === undefined) {
    throw new Error('DateTime reference can\'t be converted to value');
  }

  return v.value.spec.dateTime;
}

export function relativeDateTimeFromValueOrReference(v: UserManagedRelativeDateTimeValueOrReference): RelativeDateTime {
  if (v.value === undefined) {
    throw new Error('RelativeDateTime reference can\'t be converted to value');
  }

  return v.value.spec;
}

export function consumerSessionStartFromFromValueOrReference(v: UserManagedConsumerSessionStartFromValueOrReference): ConsumerSessionStartFrom {
  if (v.value === undefined) {
    throw new Error('ConsumerSessionStartFrom reference can\'t be converted to value');
  }

  const spec = v.value.spec;

  switch (spec.startFrom.type) {
    case 'earliestMessage': return { type: 'earliestMessage' };
    case 'latestMessage': return { type: 'latestMessage' };
    case 'nthMessageAfterEarliest': return { type: 'nthMessageAfterEarliest', n: spec.startFrom.n };
    case 'nthMessageBeforeLatest': return { type: 'nthMessageBeforeLatest', n: spec.startFrom.n };
    case 'dateTime': return {
      type: 'dateTime',
      dateTime: dateTimeFromValueOrReference(spec.startFrom.dateTime)
    };
    case 'messageId': return {
      type: 'messageId',
      hexString: messageIdFromValueOrReference(spec.startFrom.messageId)
    };
    case 'relativeDateTime': return {
      type: 'relativeDateTime',
      relativeDateTime: relativeDateTimeFromValueOrReference(spec.startFrom.relativeDateTime)
    }
  }
}

export function consumerSessionConfigFromValueOrReference(v: UserManagedConsumerSessionConfigValueOrReference): ConsumerSessionConfig {
  if (v.value === undefined) {
    throw new Error('Consumer session config reference can\'t be converted to value');
  }

  return {
    startFrom: consumerSessionStartFromFromValueOrReference(v.value.spec.startFrom),
    messageFilterChain: messageFilterChainFromValueOrReference(v.value.spec.messageFilterChain),
    topicsSelector: v.value.spec.topicsSelector
  }
}
