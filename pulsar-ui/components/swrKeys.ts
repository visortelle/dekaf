import stringify from "safe-stable-stringify";
import { TreeNode } from "./NavigationTree/TreeView";

export const swrKeys = {
  pulsar: {
    batch: {
      getTreeNodesChildrenCount: {
        _: (nodes: TreeNode[]) => ['pulsar', "batch", "getTreeNodesChildrenCount", stringify(nodes)],
      }
    },
    brokers: {
      healthCheck: {
        _: () => ["pulsar", "brokers", "healthCheck"],
      },
      backlogQuotaHealthCheck: {
        _: () => ["pulsar", "brokers", "backlogQuotaHealthCheck"],
      },
      availableDynamicConfigKeys: {
        _: () => ["pulsar", "brokers", "availableDynamicConfigKeys"],
      },
      runtimeConfig: {
        _: () => ["pulsar", "brokers", "runtimeConfig"],
      },
      dynamicConfig: {
        _: () => ["pulsar", "brokers", "dynamicConfig"],
      },
      internalConfig: {
        _: () => ["pulsar", "brokers", "internalConfig"],
      },
    },
    brokerStats: {
      metrics: {
        _: () => ["pulsar", "brokerStats", "metrics"],
      },
    },
    clusters: {
      _: () => ["pulsar", "clusters"],
    },
    tenants: {
      _: () => ["pulsar", "tenants"],
      tenant: {
        configuration: {
          _: (props: { tenant: string }) => [
            "pulsar",
            "tenants",
            props.tenant,
            "configuration",
          ],
        },
        namespaces: {
          _: (props: { tenant: string }) => [
            "pulsar",
            "tenants",
            props.tenant,
            "namespaces",
          ],
          namespace: {
            topics: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "topics",
              ],
            },
            policies: {
              policy: (props: {
                tenant: string;
                namespace: string;
                policy: string;
              }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "policies",
                props.policy,
              ],
            },
          },
        },
      },
    },
  },
};
