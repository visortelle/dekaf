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
    <Layout {...props.layout}>{children}</Layout>
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
  const getRoutes = ({
    withLayout,
    withLayoutProps,
  }: {
    withLayout: WithLayout;
    withLayoutProps: WithLayoutProps;
  }) => [
      /* Instance */
      {
        path: routes.instance.overview._.path,
        element: withLayout(
          <InstancePage view={{ type: "overview" }} />,
          withLayoutProps
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

      /* Topics */
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .messages._.path,
        element: withLayout(
          <RoutedTopicPage view="messages" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .overview._.path,
        element: withLayout(<RoutedTopicPage view="overview" />, withLayoutProps),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .policies._.path,
        element: withLayout(<RoutedTopicPage view="policies" />, withLayoutProps),
      },

      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .schema._.path,
        element: withLayout(
          <RoutedTopicPage view="schema-initial-screen" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .schema.create._.path,
        element: withLayout(
          <RoutedTopicPage view="schema-create" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .schema.view._.path,
        element: withLayout(
          <RoutedTopicPage view="schema-view" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .producers._.path,
        element: withLayout(
          <RoutedTopicPage view="producers" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic
          .subscriptions._.path,
        element: withLayout(
          <RoutedTopicPage view="subscriptions" />,
          setScrollMode(withLayoutProps, "page-own")
        ),
      },

      /* Namespaces */
      {
        path: routes.tenants.tenant.namespaces.namespace.overview._.path,
        element: withLayout(
          <RoutedNamespacePage view="overview" />,
          setScrollMode(withLayoutProps,"window")
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
        path: routes.tenants.tenant.namespaces.namespace.policies._.path,
        element: withLayout(
          <RoutedNamespacePage view="policies" />,
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
        path: routes.tenants.tenant.namespaces.namespace.permissions._.path,
        element: withLayout(
          <RoutedNamespacePage view="permissions" />,
          withLayoutProps
        ),
      },
      {
        path: routes.tenants.tenant.namespaces.namespace.subscriptionPermissions._.path,
        element: withLayout(
          <RoutedNamespacePage view="subscription-permissions" />,
          withLayoutProps
        ),
      },

      /* Subscriptions */
      {
        path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions.subscription.consumers._.path,
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
          withLayoutProps
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

const Routes: React.FC<{ withLayout: WithLayout }> = ({ withLayout }) => {
  const { paths, getRoutes } = prepareRoutes();

  const location = useLocation();
  const currentRoute = paths
    .map((p) => matchPath(p || "", location.pathname))
    .find((m) => Boolean(m));

  const tenant: TreeNode | undefined =
    currentRoute?.params?.tenant === undefined
      ? undefined
      : { type: "tenant", name: currentRoute?.params?.tenant || "unknown" };
  const namespace: TreeNode | undefined =
    currentRoute?.params?.namespace === undefined
      ? undefined
      : {
        type: "namespace",
        name: currentRoute?.params?.namespace || "unknown",
      };
  const topicType: "persistent" | "non-persistent" = currentRoute?.params
    ?.topicType as "persistent" | "non-persistent";
  const topic: TreeNode | undefined =
    topicType === undefined || currentRoute?.params?.topic === undefined
      ? undefined
      : {
        type:
          topicType === "persistent"
            ? "persistent-topic"
            : "non-persistent-topic",
        name: currentRoute?.params?.topic || "unknown",
      };

  const withLayoutProps: WithLayoutProps = {
    layout: {
      navigationTree: {
        selectedNodePath: [tenant, namespace, topic].filter(
          (n) => n !== undefined
        ) as TreeNode[],
      },
    },
  };

  return useRoutes(getRoutes({ withLayout, withLayoutProps }));
};

const RoutedTenantPage = (props: { view: TenantPageView }) => {
  const { tenant } = useParams();
  return <TenantPage tenant={tenant!} view={props.view} />;
};

const RoutedNamespacePage = (props: { view: NamespacePageView }) => {
  const { tenant, namespace } = useParams();
  return (
    <NamespacePage tenant={tenant!} namespace={namespace!} view={props.view} />
  );
};

const RoutedTopicPage = (props: { view: TopicPageView["type"] }) => {
  const { tenant, namespace, topic, topicType, schemaVersion } = useParams();
  const navigate = useNavigate();

  let view: TopicPageView;
  switch (props.view) {
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
          routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema._.get(
            {
              tenant: tenant!,
              namespace: namespace!,
              topic: topic!,
              topicType: topicType as "persistent" | "non-persistent",
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
      topicType={topicType as "persistent" | "non-persistent"}
    />
  );
};

const RoutedSubscriptionPage = (props: { view: SubscriptionPageView["type"] }) => {
  const { tenant, namespace, topic, topicType, subscription } = useParams();

  let view: SubscriptionPageView;
  switch (props.view) {
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
      topicType={topicType as "persistent" | "non-persistent"}
      subscription={subscription!}
    />
  );
};

const WithParams = (props: {
  children: (params: Readonly<Params<string>>) => React.ReactElement;
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
