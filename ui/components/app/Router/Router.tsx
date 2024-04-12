import React from "react";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import {
  BrowserRouter,
  useParams,
  useLocation,
  useRoutes,
  RouteObject,
  matchPath,
  useNavigate,
  Params,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import * as Modals from "../contexts/Modals/Modals";

import { routes } from "../../routes";
import Layout, { LayoutProps } from "../../ui/Layout/Layout";
import TenantPage, { TenantPageView } from "../../TenantPage/TenantPage";
import NamespacePage, {
  NamespacePageView,
} from "../../NamespacePage/NamespacePage";
import TopicPage, { TopicPageView } from "../../TopicPage/TopicPage";
import SubscriptionPage, { SubscriptionPageView } from '../../SubscriptionPage/SubscriptionPage';
import { TreeNode } from "../../ui/Layout/NavigationTree/TreeView";
import InstancePage from "../../InstancePage/InstancePage";
import PageNotFound from "../../ui/PageNotFound/PageNotFound";
import { PulsarTopicPersistency } from "../../pulsar/pulsar-resources";
import ResourceExistsOr404 from "./ResourceExistsOr404/ResourceExistsOr404";

type WithLayoutProps = { layout: Omit<LayoutProps, "children"> };
type WithLayout = (
  children: React.ReactElement,
  props: WithLayoutProps
) => React.ReactElement;
const defaultWithLayoutProps: WithLayoutProps = {
  layout: { navigationTree: { selectedNodePath: [] } },
};

type RouterProps = {
  basename: string;
}
const Router: React.FC<RouterProps> = (props) => {
  const withLayout: WithLayout = (children, props) => (
    <Layout {...props.layout}>
      <WithParams>
        {(params) => (
          <ResourceExistsOr404 params={params}>
            {children}
          </ResourceExistsOr404>
        )}
      </WithParams>
    </Layout>
  );

  return (
    <BrowserRouter basename={props.basename}>
      <QueryParamProvider adapter={ReactRouter6Adapter}>
        <Modals.DefaultProvider>
          <Routes withLayout={withLayout} />
        </Modals.DefaultProvider>
      </QueryParamProvider>
    </BrowserRouter>
  );
};

const prepareRoutes = (): {
  paths: string[];
  getRoutes: (props: {
    withLayout: WithLayout;
    withLayoutProps: WithLayoutProps;
  }) => RouteObject[];
} => {
  const [searchParams] = useSearchParams();
  const getRoutes = ({
    withLayout,
    withLayoutProps,
  }: {
    withLayout: WithLayout;
    withLayoutProps: WithLayoutProps;
  }) => [
      /* Instance */
      {
        // Redirect to the Instance Overview page
        path: "/",
        element: withLayout(
          <Navigate to={routes.instance.overview._.path} replace />,
          withLayoutProps
        ),
      },
      {
        path: routes.instance.overview._.path,
        element: withLayout(
          <InstancePage view={{ type: "overview" }} />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.instance.configuration._.path,
        element: withLayout(
          <InstancePage view={{ type: "configuration" }} />,
          withLayoutProps
        ),
      },
      {
        path: routes.instance.createTenant._.path,
        element: withLayout(
          <InstancePage view={{ type: "create-tenant" }} />,
          withLayoutProps
        ),
      },
      {
        path: routes.instance.tenants._.path,
        element: withLayout(
          <InstancePage view={{ type: "tenants" }} />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },

      {
        path: routes.instance.resourceGroups._.path,
        element: withLayout(
          <InstancePage view={{ type: "resource-groups" }} />,
          withLayoutProps
        ),
      },
      {
        path: routes.instance.resourceGroups.create._.path,
        element: withLayout(
          <InstancePage view={{ type: "create-resource-group" }} />,
          withLayoutProps
        ),
      },
      {
        path: routes.instance.resourceGroups.edit._.path,
        element: withLayout(
          <WithParams>
            {(params) => (
              <InstancePage
                view={{
                  type: "edit-resource-group",
                  groupName: params.groupName!,
                }}
              />
            )}
          </WithParams>,
          withLayoutProps
        ),
      },
      {
        path: routes.instance.consumerSession._.path,
        element: withLayout(
          <InstancePage view={{ type: "consumer-session", managedConsumerSessionId: searchParams.get('id') || undefined }} />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },

      /* Topics */
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .consumerSession._.path,
        element: withLayout(
          <RoutedTopicPage view="consumer-session" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .overview._.path,
        element: withLayout(
          <RoutedTopicPage view="overview" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .details._.path,
        element: withLayout(<RoutedTopicPage view="details" />, withLayoutProps),
      },

      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .schema._.path,
        element: withLayout(
          <RoutedTopicPage view="schema-initial-screen" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .schema.create._.path,
        element: withLayout(
          <RoutedTopicPage view="schema-create" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .schema.view._.path,
        element: withLayout(
          <RoutedTopicPage view="schema-view" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .producers._.path,
        element: withLayout(
          <RoutedTopicPage view="producers" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .subscriptions._.path,
        element: withLayout(
          <RoutedTopicPage view="subscriptions" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic
          .subscriptions.createSubscription._.path,
        element: withLayout(
          <RoutedTopicPage view="create-subscription" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },

      /* Namespaces */
      {
        path: routes.tenants.tenant.namespaces.namespace.overview._.path,
        element: withLayout(
          <RoutedNamespacePage view="overview" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics._.path,
        element: withLayout(
          <RoutedNamespacePage view="topics" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.details._.path,
        element: withLayout(
          <RoutedNamespacePage view="details" />,
          withLayoutProps
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.createTopic._.path,
        element: withLayout(
          <RoutedNamespacePage view="create-topic" />,
          withLayoutProps
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.consumerSession._.path,
        element: withLayout(
          <RoutedNamespacePage view="consumer-session" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },

      /* Subscriptions */
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.overview._.path,
        element: withLayout(
          <RoutedSubscriptionPage view="overview" />,
          withLayoutProps
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.consumers._.path,
        element: withLayout(
          <RoutedSubscriptionPage view="consumers" />,
          withLayoutProps
        ),
      },

      /* Tenants */
      {
        path: routes.tenants.tenant.overview._.path,
        element: withLayout(
          <RoutedTenantPage view={"overview"} />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.createNamespace._.path,
        element: withLayout(
          <RoutedTenantPage view={"create-namespace"} />,
          withLayoutProps
        ),
      },
      {
        path: routes.tenants.tenant.namespaces._.path,
        element: withLayout(
          <RoutedTenantPage view={"namespaces"} />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.consumerSession._.path,
        element: withLayout(
          <RoutedTenantPage view="consumer-session" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },

      /* Misc */
      {
        path: "*",
        element: withLayout(
          <PageNotFound />,
          withLayoutProps
        ),
      },
    ];
  const paths = getRoutes({
    withLayout: () => <></>,
    withLayoutProps: defaultWithLayoutProps,
  })
    .map((ro) => ro.path)
    .filter((p) => p !== undefined) as string[];

  return {
    paths,
    getRoutes,
  };
};

const partitionRegexp = /^(.*)-(partition-\d+)$/g;

const Routes: React.FC<{ withLayout: WithLayout }> = ({ withLayout }) => {
  const { paths, getRoutes } = prepareRoutes();

  const location = useLocation();
  const currentRoute = paths
    .map((p) => matchPath(p || "", location.pathname))
    .find((m) => Boolean(m));

  const tenant: TreeNode | undefined =
    currentRoute?.params?.tenant === undefined
      ? undefined
      : { type: "tenant", tenant: currentRoute?.params?.tenant || "unknown" };
  const namespace: TreeNode | undefined =
    currentRoute?.params?.namespace === undefined
      ? undefined
      : {
        type: "namespace",
        tenant: currentRoute?.params?.tenant || "unknown",
        namespace: currentRoute?.params?.namespace || "unknown",
      };
  const persistency: PulsarTopicPersistency = currentRoute?.params
    ?.topicPersistency! as PulsarTopicPersistency;

  const topicName = currentRoute?.params?.topic || "unknown";
  const isPartition = partitionRegexp.test(topicName);
  const topic = isPartition ? topicName.replace(partitionRegexp, "$1") : topicName;

  const topicNode: TreeNode | undefined =
    persistency === undefined || currentRoute?.params?.topic === undefined
      ? undefined : {
        type: "topic",
        persistency,
        tenant: tenant?.tenant!,
        namespace: namespace?.namespace!,
        topic,
        partitioning: { type: "non-partitioned" }, // doesn't matter here
        topicFqn: `${persistency}://${tenant?.tenant}/${namespace?.namespace}/${topic}`
      };

  const topicPartitionNode: TreeNode | undefined =
    persistency === undefined || currentRoute?.params?.topic === undefined || !isPartition ?
      undefined :
      {
        type: "topic-partition",
        persistency,
        tenant: tenant?.tenant!,
        namespace: namespace?.namespace!,
        topic,
        partition: topicName.replace(partitionRegexp, "$2"),
        partitioning: { type: "non-partitioned" }, // doesn't matter here
        topicFqn: `${persistency}://${tenant?.tenant}/${namespace?.namespace}/${topic}`
      }

  const withLayoutProps: WithLayoutProps = {
    layout: {
      navigationTree: {
        selectedNodePath: [tenant, namespace, topicNode, topicPartitionNode].filter(
          (n) => n !== undefined
        ) as TreeNode[],
      },
    },
  };

  return useRoutes(getRoutes({ withLayout, withLayoutProps }));
};

const RoutedTenantPage = (props: { view: TenantPageView['type'] }) => {
  const { tenant } = useParams();
  const [searchParams] = useSearchParams();

  let view: TenantPageView;
  switch (props.view) {
    case "consumer-session": {
      const managedConsumerSessionId = searchParams.get('id');
      view = { type: "consumer-session", managedConsumerSessionId: managedConsumerSessionId || undefined };
      break;
    }
    default: view = { type: props.view };
  }

  return <TenantPage tenant={tenant!} view={view} />;
};

const RoutedNamespacePage = (props: { view: NamespacePageView['type'] }) => {
  const { tenant, namespace } = useParams();
  const [searchParams] = useSearchParams();

  let view: NamespacePageView;
  switch (props.view) {
    case "consumer-session": {
      const managedConsumerSessionId = searchParams.get('id');
      view = { type: "consumer-session", managedConsumerSessionId: managedConsumerSessionId || undefined };
      break;
    }
    default: view = { type: props.view };
  }

  return (
    <NamespacePage tenant={tenant!} namespace={namespace!} view={view} />
  );
};

const RoutedTopicPage = (props: { view: TopicPageView["type"] }) => {
  const { tenant, namespace, topic, topicPersistency, schemaVersion } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  let view: TopicPageView;
  switch (props.view) {
    case "consumer-session": {
      const managedConsumerSessionId = searchParams.get('id');
      view = { type: "consumer-session", managedConsumerSessionId: managedConsumerSessionId || undefined };
      break;
    }
    case "schema-initial-screen":
      view = { type: "schema-initial-screen" };
      break;
    case "schema-create":
      view = { type: "schema-create" };
      break;
    case "schema-view": {
      const _schemaVersion =
        schemaVersion === undefined ? undefined : parseInt(schemaVersion, 10);
      if (_schemaVersion === undefined) {
        navigate(
          routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema._.get(
            {
              tenant: tenant!,
              namespace: namespace!,
              topic: topic!,
              topicPersistency: topicPersistency as "persistent" | "non-persistent",
            }
          )
        );
        return <></>;
      }
      view = { type: "schema-view", schemaVersion: _schemaVersion };
      break;
    }
    case "producers": {
      view = { type: "producers" };
      break;
    }
    case "subscriptions": {
      view = { type: "subscriptions" };
      break;
    }

    default:
      view = { type: props.view };
  }

  return (
    <TopicPage
      tenant={tenant!}
      namespace={namespace!}
      topic={topic!}
      view={view}
      topicPersistency={topicPersistency as "persistent" | "non-persistent"}
    />
  );
};

const RoutedSubscriptionPage = (props: { view: SubscriptionPageView["type"] }) => {
  const { tenant, namespace, topic, topicPersistency, subscription } = useParams();

  let view: SubscriptionPageView;
  switch (props.view) {
    case "overview":
      view = { type: "overview" };
      break;
    case "consumers":
      view = { type: "consumers" };
      break;
    default:
      view = { type: props.view };
  }

  return (
    <SubscriptionPage
      tenant={tenant!}
      namespace={namespace!}
      topic={topic!}
      view={view}
      topicPersistency={topicPersistency as "persistent" | "non-persistent"}
      subscription={subscription!}
    />
  );
};

const WithParams = (props: {
  children: (params: Readonly<Params>) => React.ReactElement;
}) => {
  const params = useParams();
  return props.children(params);
};

const setScrollMode = (
  withLayoutProps: WithLayoutProps,
  scrollMode: WithLayoutProps["layout"]["scrollMode"]
) => {
  return {
    ...withLayoutProps,
    layout: { ...withLayoutProps.layout, scrollMode },
  };
};

export default Router;
