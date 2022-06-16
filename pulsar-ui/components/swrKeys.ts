export const swrKeys = {
  pulsar: {
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
      },
      namespaces: {
        _: (props: { tenant: string }) => [
          "pulsar",
          "tenants",
          props.tenant,
          "namespaces",
        ],
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
        namespace: {
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
};
