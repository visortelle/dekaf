import * as t from "./user-managed-items";
import { MessageFilter, MessageFilterChain } from "../../../TopicPage/Messages/types";

export function managedMessageFilterSpecToMessageFilter(v: t.ManagedMessageFilterSpec): MessageFilter {
  return v;
}

export function managedMessageFilterSpecFromMessageFilter(v: MessageFilter): t.ManagedMessageFilterSpec {
  return v;
}

export function managedMessageFilterChainSpecToMessageFilterChain(v: t.ManagedMessageFilterChainSpec): MessageFilterChain {
  return {
    isEnabled: v.isEnabled,
    isNegated: v.isNegated,
    filters: v.filters.map(managedMessageFilterValOrRefToMessageFilter),
    mode: v.mode,
  };
}

export function managedMessageFilterValOrRefToMessageFilter(v: t.ManagedMessageFilterValOrRef): MessageFilter {
  switch (v.type) {
    case 'value':
      return managedMessageFilterSpecToMessageFilter(v.value.spec);
    case 'reference':
      throw new Error(`MessageFilter isn't resolved: ${v}`);
    default:
      throw new Error(`Unknown ManagedMessageFilterValOrRef: ${v}`);
  }
}
