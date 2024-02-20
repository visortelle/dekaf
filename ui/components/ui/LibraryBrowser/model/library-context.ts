import { PulsarResource } from "../../../pulsar/pulsar-resources"
import * as m from "./resource-matchers"
import { v4 as uuid } from "uuid";

export type LibraryContext = {
  pulsarResource: PulsarResource
}

export type DesiredMatcherType = PulsarResource['type'] | 'derive-from-context';

export function resourceMatcherFromContext(context: LibraryContext, desiredMatcherType: DesiredMatcherType): m.ResourceMatcher {
  const pulsarResource = context.pulsarResource;

  const matcherType = desiredMatcherType === 'derive-from-context' ? pulsarResource.type : desiredMatcherType;

  if (matcherType === 'instance') {
    const instanceMatcher: m.InstanceMatcher = {
      reactKey: uuid(),
      type: 'instance-matcher'
    };

    return instanceMatcher;
  }

  if (matcherType === 'tenant') {
    const tenant = (pulsarResource.type === 'tenant' || pulsarResource.type === 'namespace' || pulsarResource.type === 'topic') ? pulsarResource.tenant : '';

    const tenantMatcher: m.TenantMatcher = {
      reactKey: uuid(),
      type: 'tenant-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-tenant-matcher',
        tenant
      }
    };

    return tenantMatcher;
  }

  if (matcherType === 'namespace') {
    const tenant = (pulsarResource.type === 'tenant' || pulsarResource.type === 'namespace' || pulsarResource.type === 'topic') ? pulsarResource.tenant : '';
    const namespace = (pulsarResource.type === 'namespace' || pulsarResource.type === 'topic') ? pulsarResource.namespace : '';

    const tenantMatcher: m.TenantMatcher = {
      reactKey: uuid(),
      type: 'tenant-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-tenant-matcher',
        tenant
      }
    };
    const namespaceMatcher: m.NamespaceMatcher = {
      reactKey: uuid(),
      type: 'namespace-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-namespace-matcher',
        tenant: tenantMatcher,
        namespace
      },
    };

    return namespaceMatcher;
  }

  if (matcherType === 'topic') {
    const tenant = (pulsarResource.type === 'tenant' || pulsarResource.type === 'namespace' || pulsarResource.type === 'topic') ? pulsarResource.tenant : '';
    const namespace = (pulsarResource.type === 'namespace' || pulsarResource.type === 'topic') ? pulsarResource.namespace : '';
    const topic = (pulsarResource.type === 'topic') ? pulsarResource.topic : '';

    const tenantMatcher: m.TenantMatcher = {
      reactKey: uuid(),
      type: 'tenant-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-tenant-matcher',
        tenant
      }
    };
    const namespaceMatcher: m.NamespaceMatcher = {
      reactKey: uuid(),
      type: 'namespace-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-namespace-matcher',
        tenant: tenantMatcher,
        namespace
      },
    };

    const topicMatcher: m.TopicMatcher = {
      reactKey: uuid(),
      type: 'topic-matcher',
      value: {
        reactKey: uuid(),
        type: 'exact-topic-matcher',
        namespace: namespaceMatcher,
        topic
      }
    }

    return topicMatcher;
  }

  throw new Error(`Unsupported Pulsar resource type: ${(pulsarResource as PulsarResource).type}`);
}
