export const routes = {
  instance: {
    tenants: {
      _: {
        path: "/tenants",
        get: () => `/tenants`,
      },
    },
    overview: {
      _: {
        path: "/",
        get: () => `/`,
      },
    },
    configuration: {
      _: {
        path: "/instance/configuration",
        get: () => `/instance/configuration`,
      },
    },
    resourceGroups: {
      _: {
        path: "/instance/resource-groups",
        get: () => `/instance/resource-groups`,
      },
      create: {
        _: {
          path: "/instance/resource-groups/create",
          get: () => `/instance/resource-groups/create`,
        },
      },
      edit: {
        _: {
          path: "/instance/resource-groups/edit/:groupName",
          get: (props: { groupName: string }) =>
            `/instance/resource-groups/edit/${props.groupName}`,
        },
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
      createNamespace: {
        _: {
          path: "tenants/:tenant/create-namespace",
          get: (props: { tenant: string }) =>
            `/tenants/${props.tenant}/create-namespace`,
        },
      },
      overview: {
        _: {
          path: "tenants/:tenant/overview",
          get: (props: { tenant: string }) =>
            `/tenants/${props.tenant}/overview`,
        },
      },
      namespaces: {
        _: {
          path: "tenants/:tenant/namespaces",
          get: (props: { tenant: string }) =>
            `/tenants/${props.tenant}/namespaces`,
        },
        namespace: {
          overview: {
            _: {
              path: "tenants/:tenant/namespaces/:namespace/overview",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/overview`,
            }
          },
          policies: {
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/policies",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/policies`,
            },
          },
          createTopic: {
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/create-topic",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/create-topic`,
            },
          },
          permissions: {
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/permissions",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/permissions`,
            },
          },
          subscriptionPermissions: {
            _: {
              path: "/tenants/:tenant/namespaces/:namespace/subscription-permissions",
              get: (props: { tenant: string; namespace: string }) =>
                `/tenants/${props.tenant}/namespaces/${props.namespace}/subscription-permissions`,
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
                producers: {
                  _: {
                    path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/producers",
                    get: (props: {
                      tenant: string;
                      namespace: string;
                      topicType: "persistent" | "non-persistent";
                      topic: string;
                    }) =>
                      `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/producers`,
                  },
                },
                subscriptions: {
                  _: {
                    path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/subscriptions",
                    get: (props: {
                      tenant: string;
                      namespace: string;
                      topicType: "persistent" | "non-persistent";
                      topic: string;
                    }) =>
                      `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/subscriptions`,
                  },
                  subscription: {
                    overview: {
                      _: {
                        path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/subscriptions/:subscription",
                        get: (props: {
                          tenant: string;
                          namespace: string;
                          topicType: "persistent" | "non-persistent";
                          topic: string;
                          subscription: string;
                        }) =>
                          `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/subscriptions/${props.subscription}`,
                      },
                    },
                    consumers: {
                      _: {
                        path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/subscriptions/:subscription/consumers",
                        get: (props: {
                          tenant: string;
                          namespace: string;
                          topicType: "persistent" | "non-persistent";
                          topic: string;
                          subscription: string;
                        }) =>
                          `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/subscriptions/${props.subscription}/consumers`,
                      }
                    }
                  }
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
                  create: {
                    _: {
                      path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/schema/create",
                      get: (props: {
                        tenant: string;
                        namespace: string;
                        topicType: "persistent" | "non-persistent";
                        topic: string;
                      }) =>
                        `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/schema/create`,
                    },
                  },
                  view: {
                    _: {
                      path: "tenants/:tenant/namespaces/:namespace/topics/:topicType/:topic/schema/view/:schemaVersion",
                      get: (props: {
                        tenant: string;
                        namespace: string;
                        topicType: "persistent" | "non-persistent";
                        topic: string;
                        schemaVersion: number;
                      }) =>
                        `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}/schema/view/${props.schemaVersion}`,
                    },
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
              },
            },
          },
        },
      },
    },
  },
} as const;
