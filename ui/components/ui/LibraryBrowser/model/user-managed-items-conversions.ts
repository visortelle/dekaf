import * as t from "./user-managed-items";
import { MessageFilter, MessageFilterChain } from "../../../TopicPage/Messages/types";

export function userManagedMessageFilterSpecToMessageFilter(v: t.UserManagedMessageFilterSpec): MessageFilter {
  return v.messageFilter;
}

export function userManagedMessageFilterSpecFromMessageFilter(v: MessageFilter): t.UserManagedMessageFilterSpec {
  return {
    messageFilter: v
  };
}

export function userManagedMessageFilterChainSpecToMessageFilterChain(v: t.UserManagedMessageFilterChainSpec): MessageFilterChain {
  return {
    isEnabled: v.isEnabled,
    isNegated: v.isNegated,
    filters: v.filters.map(userManagedMessageFilterValueOrReferenceToMessageFilter),
    mode: v.mode,
  };
}

export function userManagedMessageFilterValueOrReferenceToMessageFilter(v: t.UserManagedMessageFilterValueOrReference): MessageFilter {
  switch (v.type) {
    case 'value':
      return userManagedMessageFilterSpecToMessageFilter(v.value.spec);
    case 'reference':
      throw new Error(`MessageFilter isn't resolved: ${v}`);
    default:
      throw new Error(`Unknown UserManagedMessageFilterValueOrReference: ${v}`);
  }
}
