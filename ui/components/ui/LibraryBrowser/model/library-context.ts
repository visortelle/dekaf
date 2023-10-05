import { PulsarResource } from "../../../pulsar/pulsar-resources"
import * as m from "./resource-matchers"

export type LibraryContext = {
  pulsarResource: PulsarResource
}

export function resourceMatcherFromContext(context: LibraryContext): m.ResourceMatcher {
  const pulsarResource = context.pulsarResource;

  if (pulsarResource.type === 'topic') {
    const tenantMatcher: m.TenantMatcher = {
      type: 'tenant-matcher',
      value: {
        type: 'exact-tenant-matcher',
        tenant: pulsarResource.tenant
      }
    };
    const namespaceMatcher: m.NamespaceMatcher = {
      type: 'namespace-matcher',
      value: {
        type: 'exact-namespace-matcher',
        tenant: tenantMatcher,
        namespace: pulsarResource.namespace
      },
    };

    const topicMatcher: m.TopicMatcher = {
      type: 'topic-matcher',
      value: {
        type: 'exact-topic-matcher',
        namespace: namespaceMatcher,
        persistency: pulsarResource.topicPersistency,
        topic: pulsarResource.topic
      }
    }

    return topicMatcher;
  }

  throw new Error(`Unsupported Pulsar resource type: ${pulsarResource.type}`);
}
