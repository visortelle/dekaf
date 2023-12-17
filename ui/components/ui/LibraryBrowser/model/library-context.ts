import { PulsarResource } from "../../../pulsar/pulsar-resources"
import * as m from "./resource-matchers"
import { v4 as uuid } from "uuid";

export type LibraryContext = {
  pulsarResource: PulsarResource
}

export function resourceMatcherFromContext(context: LibraryContext): m.ResourceMatcher {
  const pulsarResource = context.pulsarResource;

  if (pulsarResource.type === 'topic') {
    const tenantMatcher: m.TenantMatcher = {
      reactKey: uuid(),
      type: 'tenant-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-tenant-matcher',
        tenant: pulsarResource.tenant
      }
    };
    const namespaceMatcher: m.NamespaceMatcher = {
      reactKey: uuid(),
      type: 'namespace-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-namespace-matcher',
        tenant: tenantMatcher,
        namespace: pulsarResource.namespace
      },
    };

    const topicMatcher: m.TopicMatcher = {
      reactKey: uuid(),
      type: 'topic-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-topic-matcher',
        namespace: namespaceMatcher,
        topic: pulsarResource.topic
      }
    }

    return topicMatcher;
  }

  throw new Error(`Unsupported Pulsar resource type: ${pulsarResource.type}`);
}
