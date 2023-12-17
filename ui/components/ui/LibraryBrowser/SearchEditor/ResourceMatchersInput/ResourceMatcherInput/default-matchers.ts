import { NamespaceMatcher, TenantMatcher, TopicMatcher } from "../../../model/resource-matchers";
import { v4 as uuid } from 'uuid';

export const getDefaultTopicMatcher = (): TopicMatcher => {
  return {
    type: "topic-matcher",
    value: {
      type: "exact-topic-matcher",
      namespace: getDefaultNamespaceMatcher(),
      topic: "",
      reactKey: uuid()
    },
    reactKey: uuid()
  };
}

export const getDefaultNamespaceMatcher = (): NamespaceMatcher => {
  return {
    type: "namespace-matcher",
    reactKey: uuid(),
    value: {
      type: "exact-namespace-matcher",
      namespace: "",
      reactKey: uuid(),
      tenant: getDefaultTenantMatcher()
    }
  };
}

export const getDefaultTenantMatcher = (): TenantMatcher => {
  return {
    type: "tenant-matcher",
    value: {
      type: "exact-tenant-matcher",
      tenant: "",
      reactKey: uuid()
    },
    reactKey: uuid()
  };
}
