export const routes = {
  instance: {
    tenants: {
      _: {
        path: "/",
        get: () => `/`,
      },
    },
    overview: {
      _: {
        path: "/instance/overview",
        get: () => `/instance/overview`,
      },
    },
    configuration: {
      _: {
        path: "/instance/configuration",
        get: () => `/instance/configuration`,
      },
      resourceGroups: {
        _: {
          path: "/instance/configuration/resource-groups",
          get: () => `/instance/configuration/resource-groups`,
        }
      }
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
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/topics",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/topics`,
            },
            anyTopicType: {
              topic: {
                messages: {
                  _: {
                    path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/messages",
                    get: (props: {
                      tenant: string;
                      namespace: string;
                      topicType: "persistent" | "non-persistent";
                      topic: string;
                    }) =>
                      `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/messages`,
                  },
                },
                overview: {
                  _: {
                    path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/overview",
                    get: (props: {
                      tenant: string;
                      namespace: string;
                      topicType: "persistent" | "non-persistent";
                      topic: string;
                    }) =>
                      `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/overview`,
                  },
                },
                schema: {
                  _: {
                    path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/schema",
                    get: (props: {
                      tenant: string;
                      namespace: string;
                      topicType: "persistent" | "non-persistent";
                      topic: string;
                    }) =>
                      `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/schema`,
                  },
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
