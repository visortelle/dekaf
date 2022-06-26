export const routes = {
  instance: {
    _: {
      path: "/",
      get: () => `/`,
    },
    configuration: {
      _: {
        path: "/instance/configuration",
        get: () => `/instance/configuration`,
      },
    },
    brokerStats: {
      _: {
        path: "/instance/metrics",
        get: () => `/instance/metrics`,
      },
    },
    tenants: {
      _: {
        path: "/instance/tenants",
        get: () => `/instance/tenants`,
      },
    },
    createTenant: {
      _: {
        path: "/instance/create-tenant",
        get: () => `/instance/create-tenant`,
      },
    },
  },
  tenants: {
    tenant: {
      _: {
        path: "/tenants/:tenant",
        get: (props: { tenant: string }) => `/tenants/${props.tenant}`,
      },
      deleteTenant: {
        _: {
          path: "tenants/:tenant/delete-tenant",
          get: (props: { tenant: string }) =>
            `/tenants/${props.tenant}/delete-tenant`,
        },
      },
      createNamespace: {
        _: {
          path: "tenants/:tenant/create-namespace",
          get: (props: { tenant: string }) =>
            `/tenants/${props.tenant}/create-namespace`,
        },
      },
      configuration: {
        _: {
          path: "tenants/:tenant/configuration",
          get: (props: { tenant: string }) =>
            `/tenants/${props.tenant}/configuration`,
        },
      },
      namespaces: {
        _: {
          path: "tenants/:tenant/namespaces",
          get: (props: { tenant: string }) =>
            `/tenants/${props.tenant}/namespaces`,
        },
        namespace: {
          _: {
            path: "/tenants/:tenant/namespaces/:namespace",
            get: (props: { tenant: string; namespace: string }) =>
              `/tenants/${props.tenant}/namespaces/${props.namespace}`,
          },
          policies: {
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/policies",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/policies`,
            },
          },
          deleteNamespace: {
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/delete-namespace",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/delete-namespace`,
            },
          },
          createTopic: {
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/create-topic",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/create-topic`,
            },
          },
          topics: {
            anyTopicType: {
              topic: {
                _: {
                  path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic",
                  get: (props: {
                    tenant: string;
                    namespace: string;
                    topicType: "persistent" | "non-persistent";
                    topic: string;
                  }) =>
                    `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}`,
                },
                policies: {
                  _: {
                    path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/policies",
                    get: (props: {
                      tenant: string;
                      namespace: string;
                      topicType: "persistent" | "non-persistent";
                      topic: string;
                    }) =>
                      `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/policies`,
                  },
                },
                deleteTopic: {
                  _: {
                    path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/delete-topic",
                    get: (props: {
                      tenant: string;
                      namespace: string;
                      topicType: "persistent" | "non-persistent";
                      topic: string;
                    }) =>
                      `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/delete-topic`,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
