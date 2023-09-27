import { consumerSessionConfigToPb, messageFilterToPb, messageFilterChainToPb } from "../../TopicPage/Messages/conversions";
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as t from "./types";

export function exactTenantMatcherToPb(matcher: t.ExactTenantMatcher): pb.ExactTenantMatcher {
  const matcherPb = new pb.ExactTenantMatcher();
  matcherPb.setTenant(matcher.tenant);
  return matcherPb;
}

export function exactTenantMatcherFromPb(matcherPb: pb.ExactTenantMatcher): t.ExactTenantMatcher {
  return {
    type: 'exact-tenant-matcher',
    tenant: matcherPb.getTenant()
  };
}

export function regexTenantMatcherToPb(matcher: t.RegexTenantMatcher): pb.RegexTenantMatcher {
  const matcherPb = new pb.RegexTenantMatcher();
  matcherPb.setTenantRegex(matcher.tenantRegex);
  return matcherPb;
}

export function regexTenantMatcherFromPb(matcherPb: pb.RegexTenantMatcher): t.RegexTenantMatcher {
  return {
    type: 'regex-tenant-matcher',
    tenantRegex: matcherPb.getTenantRegex()
  };
}

export function tenantMatcherToPb(matcher: t.TenantMatcher): pb.TenantMatcher {
  const matcherPb = new pb.TenantMatcher();
  switch (matcher.value.type) {
    case 'exact-tenant-matcher':
      matcherPb.setExact(exactTenantMatcherToPb(matcher.value));
      break;
    case 'regex-tenant-matcher':
      matcherPb.setRegex(regexTenantMatcherToPb(matcher.value));
      break;
  }
  return matcherPb;
}

export function tenantMatcherFromPb(matcherPb: pb.TenantMatcher): t.TenantMatcher {
  switch (matcherPb.getMatcherCase()) {
    case pb.TenantMatcher.MatcherCase.EXACT: {
      const exactTenantMatcherPb = matcherPb.getExact();
      if (exactTenantMatcherPb === undefined) {
        throw new Error('Exact tenant matcher is undefined');
      }

      return {
        type: 'tenant-matcher',
        value: exactTenantMatcherFromPb(exactTenantMatcherPb)
      };
    }

    case pb.TenantMatcher.MatcherCase.REGEX: {
      const regexTenantMatcherPb = matcherPb.getRegex();
      if (regexTenantMatcherPb === undefined) {
        throw new Error('Regex tenant matcher is undefined');
      }

      return {
        type: 'tenant-matcher',
        value: regexTenantMatcherFromPb(regexTenantMatcherPb)
      };
    }

    default: throw new Error(`Unknown matcher case: ${matcherPb.getMatcherCase()}`);
  }
}

export function exactNamespaceMatcherToPb(matcher: t.ExactNamespaceMatcher): pb.ExactNamespaceMatcher {
  const matcherPb = new pb.ExactNamespaceMatcher();
  matcherPb.setTenant(tenantMatcherToPb(matcher.tenant));
  matcherPb.setNamespace(matcher.namespace);
  return matcherPb;
}

export function exactNamespaceMatcherFromPb(matcherPb: pb.ExactNamespaceMatcher): t.ExactNamespaceMatcher {
  const tenantMatcherPb = matcherPb.getTenant();
  if (tenantMatcherPb === undefined) {
    throw new Error('Tenant matcher is undefined');
  }

  return {
    type: 'exact-namespace-matcher',
    tenant: tenantMatcherFromPb(tenantMatcherPb),
    namespace: matcherPb.getNamespace()
  };
}

export function regexNamespaceMatcherToPb(matcher: t.RegexNamespaceMatcher): pb.RegexNamespaceMatcher {
  const matcherPb = new pb.RegexNamespaceMatcher();
  matcherPb.setTenant(tenantMatcherToPb(matcher.tenant));
  matcherPb.setNamespaceRegex(matcher.namespaceRegex);
  return matcherPb;
}

export function regexNamespaceMatcherFromPb(matcherPb: pb.RegexNamespaceMatcher): t.RegexNamespaceMatcher {
  const tenantMatcherPb = matcherPb.getTenant();
  if (tenantMatcherPb === undefined) {
    throw new Error('Tenant matcher is undefined');
  }

  return {
    type: 'regex-namespace-matcher',
    tenant: tenantMatcherFromPb(tenantMatcherPb),
    namespaceRegex: matcherPb.getNamespaceRegex()
  };
}

export function namespaceMatcherToPb(matcher: t.NamespaceMatcher): pb.NamespaceMatcher {
  const matcherPb = new pb.NamespaceMatcher();
  switch (matcher.value.type) {
    case 'exact-namespace-matcher':
      matcherPb.setExact(exactNamespaceMatcherToPb(matcher.value));
      break;
    case 'regex-namespace-matcher':
      matcherPb.setRegex(regexNamespaceMatcherToPb(matcher.value));
      break;
  }
  return matcherPb;
}

export function namespaceMatcherFromPb(matcherPb: pb.NamespaceMatcher): t.NamespaceMatcher {
  switch (matcherPb.getMatcherCase()) {
    case pb.NamespaceMatcher.MatcherCase.EXACT: {
      const exactNamespaceMatcherPb = matcherPb.getExact();
      if (exactNamespaceMatcherPb === undefined) {
        throw new Error('Exact namespace matcher is undefined');
      }

      return {
        type: 'namespace-matcher',
        value: exactNamespaceMatcherFromPb(exactNamespaceMatcherPb)
      };
    }

    case pb.NamespaceMatcher.MatcherCase.REGEX: {
      const regexNamespaceMatcherPb = matcherPb.getRegex();
      if (regexNamespaceMatcherPb === undefined) {
        throw new Error('Regex namespace matcher is undefined');
      }

      return {
        type: 'namespace-matcher',
        value: regexNamespaceMatcherFromPb(regexNamespaceMatcherPb)
      };
    }

    default: throw new Error(`Unknown matcher case: ${matcherPb.getMatcherCase()}`);
  }
}

export function topicPersistencyToPb(persistency: t.TopicPersistency): pb.TopicPersistency {
  switch (persistency) {
    case 'persistent':
      return pb.TopicPersistency.TOPIC_PERSISTENCY_PERSISTENT;
    case 'non-persistent':
      return pb.TopicPersistency.TOPIC_PERSISTENCY_NON_PERSISTENT;
    case 'any':
      return pb.TopicPersistency.TOPIC_PERSISTENCY_ANY;
  }
}

export function topicPersistencyFromPb(persistencyPb: pb.TopicPersistency): t.TopicPersistency {
  switch (persistencyPb) {
    case pb.TopicPersistency.TOPIC_PERSISTENCY_PERSISTENT:
      return 'persistent';
    case pb.TopicPersistency.TOPIC_PERSISTENCY_NON_PERSISTENT:
      return 'non-persistent';
    case pb.TopicPersistency.TOPIC_PERSISTENCY_ANY:
      return 'any';
    default:
      throw new Error(`Unknown topic persistency: ${persistencyPb}`);
  }
}

export function exactTopicMatcherToPb(matcher: t.ExactTopicMatcher): pb.ExactTopicMatcher {
  const matcherPb = new pb.ExactTopicMatcher();
  matcherPb.setPersistency(topicPersistencyToPb(matcher.persistency));
  matcherPb.setNamespace(namespaceMatcherToPb(matcher.namespace));
  matcherPb.setTopic(matcher.topic);
  return matcherPb;
}

export function exactTopicMatcherFromPb(matcherPb: pb.ExactTopicMatcher): t.ExactTopicMatcher {
  const namespaceMatcherPb = matcherPb.getNamespace();
  if (namespaceMatcherPb === undefined) {
    throw new Error('Namespace matcher is undefined');
  }

  return {
    type: 'exact-topic-matcher',
    persistency: topicPersistencyFromPb(matcherPb.getPersistency()),
    namespace: namespaceMatcherFromPb(namespaceMatcherPb),
    topic: matcherPb.getTopic()
  };
}

export function regexTopicMatcherToPb(matcher: t.RegexTopicMatcher): pb.RegexTopicMatcher {
  const matcherPb = new pb.RegexTopicMatcher();
  matcherPb.setPersistency(topicPersistencyToPb(matcher.persistency));
  matcherPb.setNamespace(namespaceMatcherToPb(matcher.namespace));
  matcherPb.setTopicRegex(matcher.topicRegex);
  return matcherPb;
}

export function regexTopicMatcherFromPb(matcherPb: pb.RegexTopicMatcher): t.RegexTopicMatcher {
  const namespaceMatcherPb = matcherPb.getNamespace();
  if (namespaceMatcherPb === undefined) {
    throw new Error('Namespace matcher is undefined');
  }

  return {
    type: 'regex-topic-matcher',
    persistency: topicPersistencyFromPb(matcherPb.getPersistency()),
    namespace: namespaceMatcherFromPb(namespaceMatcherPb),
    topicRegex: matcherPb.getTopicRegex()
  };
}

export function topicMatcherToPb(matcher: t.TopicMatcher): pb.TopicMatcher {
  const matcherPb = new pb.TopicMatcher();
  switch (matcher.value.type) {
    case 'exact-topic-matcher':
      matcherPb.setExact(exactTopicMatcherToPb(matcher.value));
      break;
    case 'regex-topic-matcher':
      matcherPb.setRegex(regexTopicMatcherToPb(matcher.value));
      break;
  }
  return matcherPb;
}

export function topicMatcherFromPb(matcherPb: pb.TopicMatcher): t.TopicMatcher {
  switch (matcherPb.getMatcherCase()) {
    case pb.TopicMatcher.MatcherCase.EXACT: {
      const exactTopicMatcherPb = matcherPb.getExact();
      if (exactTopicMatcherPb === undefined) {
        throw new Error('Exact topic matcher is undefined');
      }

      return {
        type: 'topic-matcher',
        value: exactTopicMatcherFromPb(exactTopicMatcherPb)
      };
    }

    case pb.TopicMatcher.MatcherCase.REGEX: {
      const regexTopicMatcherPb = matcherPb.getRegex();
      if (regexTopicMatcherPb === undefined) {
        throw new Error('Regex topic matcher is undefined');
      }

      return {
        type: 'topic-matcher',
        value: regexTopicMatcherFromPb(regexTopicMatcherPb)
      };
    }

    default: throw new Error(`Unknown matcher case: ${matcherPb.getMatcherCase()}`);
  }
}

export function resourceMatcherToPb(matcher: t.ResourceMatcher): pb.ResourceMatcher {
  const matcherPb = new pb.ResourceMatcher();
  switch (matcher.type) {
    case 'tenant-matcher':
      matcherPb.setTenant(tenantMatcherToPb(matcher));
      break;
    case 'namespace-matcher':
      matcherPb.setNamespace(namespaceMatcherToPb(matcher));
      break;
    case 'topic-matcher':
      matcherPb.setTopic(topicMatcherToPb(matcher));
      break;
  }
  return matcherPb;
}

export function resourceMatcherFromPb(matcherPb: pb.ResourceMatcher): t.ResourceMatcher {
  switch (matcherPb.getMatcherCase()) {
    case pb.ResourceMatcher.MatcherCase.TENANT: {
      const tenantMatcherPb = matcherPb.getTenant();
      if (tenantMatcherPb === undefined) {
        throw new Error('Tenant matcher is undefined');
      }

      return tenantMatcherFromPb(tenantMatcherPb);
    }

    case pb.ResourceMatcher.MatcherCase.NAMESPACE: {
      const namespaceMatcherPb = matcherPb.getNamespace();
      if (namespaceMatcherPb === undefined) {
        throw new Error('Namespace matcher is undefined');
      }

      return namespaceMatcherFromPb(namespaceMatcherPb);
    }

    case pb.ResourceMatcher.MatcherCase.TOPIC: {
      const topicMatcherPb = matcherPb.getTopic();
      if (topicMatcherPb === undefined) {
        throw new Error('Topic matcher is undefined');
      }

      return topicMatcherFromPb(topicMatcherPb);
    }

    default: throw new Error(`Unknown matcher case: ${matcherPb.getMatcherCase()}`);
  }
}

export function libraryItemDescriptorToPb(descriptor: t.LibraryItemDescriptor): pb.LibraryItemDescriptor {
  switch (descriptor.type) {
    case 'consumer-session-config': {
      const descriptorPb = new pb.LibraryItemDescriptor();
      descriptorPb.setConsumerSessionConfig(consumerSessionConfigToPb(descriptor.value));
      return descriptorPb;
    }
    case 'message-filter': {
      const descriptorPb = new pb.LibraryItemDescriptor();
      descriptorPb.setMessageFilter(messageFilterToPb(descriptor.value));
      return descriptorPb;
    }
    case 'message-filter-chain': {
      const descriptorPb = new pb.LibraryItemDescriptor();
      descriptorPb.setMessageFilterChain(messageFilterChainToPb(descriptor.value));
      return descriptorPb;
    }
  }
}

export function libraryItemToPb(item: t.LibraryItem): pb.LibraryItem {
  const itemPb = new pb.LibraryItem();
  itemPb.setId(item.id);
  itemPb.setRevision(item.revision);
  itemPb.setUpdatedAt(item.updatedAt);
  itemPb.setIsEditable(item.isEditable);
  itemPb.setName(item.name);
  itemPb.setDescriptionMarkdown(item.descriptionMarkdown);
  itemPb.setTagsList(item.tags);

  // const resources = item.re.map(resourceMatcherToPb);
  // resources
  // descriptor
}
