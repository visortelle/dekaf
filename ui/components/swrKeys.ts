import stringify from "safe-stable-stringify";

export const swrKeys = {
  pulsar: {
    auth: {
      credentials: {
        _: () => ["pulsar", "auth", "credentials"],
        current: {
          _: () => ["pulsar", "auth", "credentials", "current"],
        }
      },
    },
    schemas: {
      getLatestSchemaInfo: {
        _: (topic: string) => [
          "pulsar",
          "schemas",
          "getLatestSchemaInfo",
          topic,
        ],
      },
      listSchemas: {
        _: (topic: string) => ["pulsar", "schemas", "listSchemas", topic],
      },
    },
    customApi: {
      metrics: {
        allTenants: {
          _: () => ["customApi", "metrics", "allTenants"],
        },
        tenant: {
          _: (tenant: string) => ["customApi", "metrics", "tenants", tenant],
        },
        allTenantNamespaces: {
          _: (tenant: string) => [
            "customApi",
            "metrics",
            "allTenantNamespaces",
            tenant,
          ],
        },
        allNamespaceTopics: {
          _: (tenant: string, namespace: string) => [
            "customApi",
            "metrics",
            "allNamespaceTopics",
            tenant,
            namespace,
          ],
        },
        namespace: {
          _: (tenant: string, namespace: string) => [
            "customApi",
            "metrics",
            "namespaces",
            tenant,
            namespace,
          ],
        },
        topicsStats: {
          _: (topics: string[]) => [
            "customApi",
            "metrics",
            "topicsStats",
            stringify(topics),
          ],
        },
        topicsInternalStats: {
          _: (topics: string[]) => [
            "customApi",
            "metrics",
            "topicsInternalStats",
            stringify(topics),
          ],
        },
        topicsProperties: {
          _: (topics: string[]) => [
            "customApi",
            "metrics",
            "properties",
            stringify(topics)
          ],
        },
        isPartitionedTopic: {
          _: (topic: string) => [
            "customApi",
            "metrics",
            "isPartitionedTopic",
            topic,
          ],
        },
      },
      checkResourceExists: {
        _: (props: {
          tenant: string | undefined,
          namespace: string | undefined,
          topic: string | undefined,
          topicPersistency: string | undefined,
          schemaVersion: string | undefined,
          subscription: string | undefined
        }) => [
            "customApi",
            "checkResourceExists",
            props.tenant,
            props.namespace,
            props.topic,
            props.topicPersistency,
            props.schemaVersion,
            props.subscription
          ]
      }
    },
    batch: {
      getTenantsNamespacesCount: {
        _: (tenants: string[]) => [
          "pulsar",
          "batch",
          "getTenantsNamespacesCount",
          stringify(tenants),
        ],
      },
      getTenantNamespacesTopicsCount: {
        _: (tenant: string, namespaces: string[]) => [
          "pulsar",
          "batch",
          "getTenantNamespacesTopicsCount",
          tenant,
          stringify(namespaces),
        ],
      },
      getTenantsInfo: {
        _: (tenants: string[]) => [
          "pulsar",
          "batch",
          "getTenantsInfo",
          stringify(tenants),
        ],
      },
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
      resourceGroups: {
        _: () => ["pulsar", "brokers", "resourceGroups"],
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
      cluster: {
        _: (props: { cluster: string }) => ["pulsar", "cluster", props.cluster],
      }
    },
    tenants: {
      listTenants: {
        _: () => ["pulsar", "tenants"]
      },
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
            permissions: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "permissions",
              ],
            },
            subscriptionPermissions: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "subscriptionPermissions",
              ],
            },
            topic: {
              topicCompactionStatus: (props: { topicFqn: string }) => [
                "pulsar",
                "topics",
                props.topicFqn
              ]
            },
            nonPartitionedTopics: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "nonPartitionedTopics",
              ],
            },
            partitionedTopics: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "partitionedTopics",
              ],
            },
            nonPersistentTopics: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "nonPersistentTopics",
              ],
              policies: {
                policy: (props: {
                  tenant: string;
                  namespace: string;
                  policy: string;
                  isGlobal: boolean;
                }) => [
                    "pulsar",
                    "tenants",
                    props.tenant,
                    "namespaces",
                    props.namespace,
                    "nonPersistentTopics",
                    "policies",
                    props.policy,
                    props.isGlobal,
                  ],
              },
            },
            persistentTopics: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "persistentTopics",
              ],
              policies: {
                policy: (props: {
                  tenant: string;
                  namespace: string;
                  policy: string;
                  isGlobal: boolean;
                }) => [
                    "pulsar",
                    "tenants",
                    props.tenant,
                    "namespaces",
                    props.namespace,
                    "persistentTopics",
                    "policies",
                    props.policy,
                    props.isGlobal,
                  ],
              },
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
            bundles: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "bundles",
              ],
            },
            statistics: {
              _: (props: { tenant: string; namespace: string }) => [
                "pulsar",
                "tenants",
                props.tenant,
                "namespaces",
                props.namespace,
                "statistics",
              ],
            }
          },
        },
      },
    },
  },
};
