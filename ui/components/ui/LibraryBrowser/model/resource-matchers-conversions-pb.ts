import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/resource_matchers_pb";
import * as t from "./resource-matchers";
import { v4 as uuid } from 'uuid';

export function instanceMatcherToPb(matcher: t.InstanceMatcher): pb.InstanceMatcher {
  const matcherPb = new pb.InstanceMatcher();
  return matcherPb;
}

export function instanceMatcherFromPb(matcherPb: pb.InstanceMatcher): t.InstanceMatcher {
  return {
    reactKey: uuid(),
    type: 'instance-matcher',
  };
}

export function exactTenantMatcherToPb(matcher: t.ExactTenantMatcher): pb.ExactTenantMatcher {
  const matcherPb = new pb.ExactTenantMatcher();
  matcherPb.setTenant(matcher.tenant);
  return matcherPb;
}

export function exactTenantMatcherFromPb(matcherPb: pb.ExactTenantMatcher): t.ExactTenantMatcher {
  return {
    reactKey: uuid(),
    type: 'exact-tenant-matcher',
    tenant: matcherPb.getTenant()
  };
}

export function allTenantMatcherToPb(matcher: t.AllTenantMatcher): pb.AllTenantMatcher {
  const matcherPb = new pb.AllTenantMatcher();
  return matcherPb;
}

export function allTenantMatcherFromPb(matcherPb: pb.AllTenantMatcher): t.AllTenantMatcher {
  return {
    reactKey: uuid(),
    type: 'all-tenant-matcher',
  };
}

export function tenantMatcherToPb(matcher: t.TenantMatcher): pb.TenantMatcher {
  const matcherPb = new pb.TenantMatcher();
  switch (matcher.value.type) {
    case 'exact-tenant-matcher':
      matcherPb.setExact(exactTenantMatcherToPb(matcher.value));
      break;
    case 'all-tenant-matcher':
      matcherPb.setAll(allTenantMatcherToPb(matcher.value));
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
        reactKey: uuid(),
        type: 'tenant-matcher',
        value: exactTenantMatcherFromPb(exactTenantMatcherPb)
      };
    }

    case pb.TenantMatcher.MatcherCase.ALL: {
      const allTenantMatcherPb = matcherPb.getAll();
      if (allTenantMatcherPb === undefined) {
        throw new Error('All tenant matcher is undefined');
      }

      return {
        reactKey: uuid(),
        type: 'tenant-matcher',
        value: allTenantMatcherFromPb(allTenantMatcherPb)
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
    reactKey: uuid(),
    type: 'exact-namespace-matcher',
    tenant: tenantMatcherFromPb(tenantMatcherPb),
    namespace: matcherPb.getNamespace()
  };
}

export function allNamespaceMatcherToPb(matcher: t.AllNamespaceMatcher): pb.AllNamespaceMatcher {
  const matcherPb = new pb.AllNamespaceMatcher();
  matcherPb.setTenant(tenantMatcherToPb(matcher.tenant));
  return matcherPb;
}

export function allNamespaceMatcherFromPb(matcherPb: pb.AllNamespaceMatcher): t.AllNamespaceMatcher {
  const tenantMatcherPb = matcherPb.getTenant();
  if (tenantMatcherPb === undefined) {
    throw new Error('Tenant matcher is undefined');
  }

  return {
    reactKey: uuid(),
    type: 'all-namespace-matcher',
    tenant: tenantMatcherFromPb(tenantMatcherPb),
  };
}

export function namespaceMatcherToPb(matcher: t.NamespaceMatcher): pb.NamespaceMatcher {
  const matcherPb = new pb.NamespaceMatcher();
  switch (matcher.value.type) {
    case 'exact-namespace-matcher':
      matcherPb.setExact(exactNamespaceMatcherToPb(matcher.value));
      break;
    case 'all-namespace-matcher':
      matcherPb.setAll(allNamespaceMatcherToPb(matcher.value));
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
        reactKey: uuid(),
        type: 'namespace-matcher',
        value: exactNamespaceMatcherFromPb(exactNamespaceMatcherPb)
      };
    }

    case pb.NamespaceMatcher.MatcherCase.ALL: {
      const allNamespaceMatcherPb = matcherPb.getAll();
      if (allNamespaceMatcherPb === undefined) {
        throw new Error('All namespace matcher is undefined');
      }

      return {
        reactKey: uuid(),
        type: 'namespace-matcher',
        value: allNamespaceMatcherFromPb(allNamespaceMatcherPb)
      };
    }

    default: throw new Error(`Unknown matcher case: ${matcherPb.getMatcherCase()}`);
  }
}

export function exactTopicMatcherToPb(matcher: t.ExactTopicMatcher): pb.ExactTopicMatcher {
  const matcherPb = new pb.ExactTopicMatcher();
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
    reactKey: uuid(),
    type: 'exact-topic-matcher',
    namespace: namespaceMatcherFromPb(namespaceMatcherPb),
    topic: matcherPb.getTopic()
  };
}

export function allTopicMatcherToPb(matcher: t.AllTopicMatcher): pb.AllTopicMatcher {
  const matcherPb = new pb.AllTopicMatcher();
  matcherPb.setNamespace(namespaceMatcherToPb(matcher.namespace));
  return matcherPb;
}

export function allTopicMatcherFromPb(matcherPb: pb.AllTopicMatcher): t.AllTopicMatcher {
  const namespaceMatcherPb = matcherPb.getNamespace();
  if (namespaceMatcherPb === undefined) {
    throw new Error('Namespace matcher is undefined');
  }

  return {
    reactKey: uuid(),
    type: 'all-topic-matcher',
    namespace: namespaceMatcherFromPb(namespaceMatcherPb),
  };
}

export function topicMatcherToPb(matcher: t.TopicMatcher): pb.TopicMatcher {
  const matcherPb = new pb.TopicMatcher();
  switch (matcher.value.type) {
    case 'exact-topic-matcher':
      matcherPb.setExact(exactTopicMatcherToPb(matcher.value));
      break;
    case 'all-topic-matcher':
      matcherPb.setAll(allTopicMatcherToPb(matcher.value));
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
        reactKey: uuid(),
        type: 'topic-matcher',
        value: exactTopicMatcherFromPb(exactTopicMatcherPb)
      };
    }

    case pb.TopicMatcher.MatcherCase.ALL: {
      const allTopicMatcherPb = matcherPb.getAll();
      if (allTopicMatcherPb === undefined) {
        throw new Error('All topic matcher is undefined');
      }

      return {
        reactKey: uuid(),
        type: 'topic-matcher',
        value: allTopicMatcherFromPb(allTopicMatcherPb)
      };
    }

    default: throw new Error(`Unknown matcher case: ${matcherPb.getMatcherCase()}`);
  }
}

export function resourceMatcherToPb(matcher: t.ResourceMatcher): pb.ResourceMatcher {
  const matcherPb = new pb.ResourceMatcher();

  switch (matcher.type) {
    case 'instance-matcher':
      matcherPb.setInstance(instanceMatcherToPb(matcher));
      break;
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
    case pb.ResourceMatcher.MatcherCase.INSTANCE: {
      const instanceMatcherPb = matcherPb.getInstance();
      if (instanceMatcherPb === undefined) {
        throw new Error('Instance matcher is undefined');
      }

      const instanceMatcher = instanceMatcherFromPb(instanceMatcherPb);
      return { ...instanceMatcher, reactKey: uuid() };
    }

    case pb.ResourceMatcher.MatcherCase.TENANT: {
      const tenantMatcherPb = matcherPb.getTenant();
      if (tenantMatcherPb === undefined) {
        throw new Error('Tenant matcher is undefined');
      }

      const tenantMatcher = tenantMatcherFromPb(tenantMatcherPb);
      return { ...tenantMatcher, reactKey: uuid() };
    }

    case pb.ResourceMatcher.MatcherCase.NAMESPACE: {
      const namespaceMatcherPb = matcherPb.getNamespace();
      if (namespaceMatcherPb === undefined) {
        throw new Error('Namespace matcher is undefined');
      }

      const namespaceMatcher = namespaceMatcherFromPb(namespaceMatcherPb);
      return { ...namespaceMatcher, reactKey: uuid() };
    }

    case pb.ResourceMatcher.MatcherCase.TOPIC: {
      const topicMatcherPb = matcherPb.getTopic();
      if (topicMatcherPb === undefined) {
        throw new Error('Topic matcher is undefined');
      }

      const topicMatcher = topicMatcherFromPb(topicMatcherPb);
      return { ...topicMatcher, reactKey: uuid() };
    }

    default: throw new Error(`Unknown matcher case: ${matcherPb.getMatcherCase()}`);
  }
}
