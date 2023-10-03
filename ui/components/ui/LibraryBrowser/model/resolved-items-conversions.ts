import { UserManagedConsumerSessionConfigValueOrReference, UserManagedMessageFilterChainValueOrReference, UserManagedMessageFilterValueOrReference } from "./user-managed-items";
import { ConsumerSessionConfig, MessageFilter, MessageFilterChain } from "../../../TopicPage/Messages/types";

export function messageFilterFromValueOrReference(v: UserManagedMessageFilterValueOrReference): MessageFilter {
  if (v.type !== 'value') {
    throw new Error('Message filter reference can\'t be converted to message filter');
  }

  return v.value.spec;
}

export function messageFilterChainFromValueOrReference(v: UserManagedMessageFilterChainValueOrReference): MessageFilterChain {
  if (v.type !== 'value') {
    throw new Error('Message filter chain reference can\'t be converted to message filter chain');
  }

  return {
    isEnabled: v.value.spec.isEnabled,
    isNegated: v.value.spec.isNegated,
    filters: v.value.spec.filters.map(messageFilterFromValueOrReference),
    mode: v.value.spec.mode
  }
}

export function consumerSessionConfigFromValueOrReference(v: UserManagedConsumerSessionConfigValueOrReference): ConsumerSessionConfig {
  if (v.type !== 'value') {
    throw new Error('Consumer session config reference can\'t be converted to consumer session config');
  }

  return {
    startFrom: { type: 'earliestMessage' },
    messageFilterChain: messageFilterChainFromValueOrReference(v.value.spec.messageFilterChain),
    topicsSelector: { type: 'by-names', topics: ['persistent://a/b/c'] }
  }
}
