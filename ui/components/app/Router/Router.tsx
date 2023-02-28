import React from "react";
import { QueryParamProvider } from "use-query-params";
import { BrowserRouter, useParams, useLocation, useRoutes, RouteObject, matchPath, useNavigate, Params } from "react-router-dom";
import { Location } from "react-router-dom";
import * as Modals from "../contexts/Modals/Modals";

import { routes } from '../../routes';
import Layout, { LayoutProps } from '../../ui/Layout/Layout';
import TenantPage, { TenantPageView } from '../../TenantPage/TenantPage';
import NamespacePage, { NamespacePageView } from '../../NamespacePage/NamespacePage';
import TopicPage, { TopicPageView } from '../../TopicPage/TopicPage';
import { TreeNode } from '../../NavigationTree/TreeView';
import InstancePage from '../../InstancePage/InstancePage';
import IoPage, { IoPageView } from '../../NamespacePage/IoPage/IoPage';

type WithLayoutProps = { layout: Omit<LayoutProps, "children"> };
type WithLayout = (children: React.ReactElement, props: WithLayoutProps) => React.ReactElement;
const defaultWithLayoutProps: WithLayoutProps = { layout: { navigationTree: { selectedNodePath: [] } } };

const Router: React.FC = () => {
  const withLayout: WithLayout = (children, props) => <Layout {...props.layout}>{children}</Layout>;

  return (
    <BrowserRouter>
      <QueryParamProvider ReactRouterRoute={RouteAdapter}>
        <Modals.DefaultProvider>
          <Routes withLayout={withLayout} />
        </Modals.DefaultProvider>
      </QueryParamProvider>
    </BrowserRouter>
  );
};

const prepareRoutes = (): {
  paths: string[];
  getRoutes: (props: { withLayout: WithLayout; withLayoutProps: WithLayoutProps }) => RouteObject[];
} => {
  const getRoutes = ({ withLayout, withLayoutProps }: { withLayout: WithLayout; withLayoutProps: WithLayoutProps }) => [
    /* Instance */
    { 
      path: routes.instance.overview._.path,
      element: withLayout(<InstancePage view={{ type: "overview" }} />, withLayoutProps)
    },
    { 
      path: routes.instance.configuration._.path,
      element: withLayout(<InstancePage view={{ type: "configuration" }} />, withLayoutProps)
    },
    { 
      path: routes.instance.createTenant._.path,
      element: withLayout(<InstancePage view={{ type: "create-tenant" }} />, withLayoutProps)
    },
    {
      path: routes.instance.tenants._.path,
      element: withLayout(<InstancePage view={{ type: "tenants" }} />, setScrollMode(withLayoutProps, "page-own")),
    },
    {
      path: routes.instance.resourceGroups._.path,
      element: withLayout(<InstancePage view={{ type: "resource-groups" }} />, withLayoutProps),
    },
    {
      path: routes.instance.resourceGroups.create._.path,
      element: withLayout(<InstancePage view={{ type: "create-resource-group" }} />, withLayoutProps),
    },
    {
      path: routes.instance.resourceGroups.edit._.path,
      element: withLayout(
        <WithParams>{(params) => <InstancePage view={{ type: "edit-resource-group", groupName: params.groupName! }} />}</WithParams>,
        withLayoutProps,
      ),
    },

    /* Topics */
    {
      path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.path,
      element: withLayout(<RoutedTopicPage view="messages" />, setScrollMode(withLayoutProps, "page-own")),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.overview._.path,
      element: withLayout(<RoutedTopicPage view="overview" />, withLayoutProps),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.policies._.path,
      element: withLayout(<RoutedTopicPage view="policies" />, withLayoutProps),
    },

    {
      path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema._.path,
      element: withLayout(<RoutedTopicPage view="schema-initial-screen" />, setScrollMode(withLayoutProps, "page-own")),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema.create._.path,
      element: withLayout(<RoutedTopicPage view="schema-create" />, setScrollMode(withLayoutProps, "page-own")),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema.view._.path,
      element: withLayout(<RoutedTopicPage view="schema-view" />, setScrollMode(withLayoutProps, "page-own")),
    },

    /* Namespaces */
    {
      path: routes.tenants.tenant.namespaces.namespace.topics._.path,
      element: withLayout(<RoutedNamespacePage view='topics' />, setScrollMode(withLayoutProps, "page-own")),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.policies._.path,
      element: withLayout(<RoutedNamespacePage view='policies' />, withLayoutProps),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.createTopic._.path,
      element: withLayout(<RoutedNamespacePage view='create-topic' />, withLayoutProps),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.permissions._.path,
      element: withLayout(<RoutedNamespacePage view='permissions' />, withLayoutProps),
    },
    {
      path: routes.tenants.tenant.namespaces.namespace.subscriptionPermissions._.path,
      element: withLayout(<RoutedNamespacePage view='subscription-permissions' />, withLayoutProps),
    },

    /* Io */
    { 
      path: routes.tenants.tenant.namespaces.namespace.io.sinks._.path,
      element: withLayout(<RoutedIoPage view={'sinks'} />, withLayoutProps)
    },
    { 
      path: routes.tenants.tenant.namespaces.namespace.io.sinks.create._.path,
      element: withLayout(<RoutedIoPage view={'sinks-create'} />, withLayoutProps)
    },
    { 
      path: routes.tenants.tenant.namespaces.namespace.io.sinks.edit._.path,
      element: withLayout(
        <WithParams>
          {(params) => <RoutedIoPage  view={'sinks-edit'} sink={params.sink} />}
        </WithParams>, withLayoutProps
      )
    },
    { 
      path: routes.tenants.tenant.namespaces.namespace.io.sources._.path,
      element: withLayout(<RoutedIoPage view={'sources'} />, withLayoutProps) 
    },
    { 
      path: routes.tenants.tenant.namespaces.namespace.io.sources.create._.path,
      element: withLayout(<RoutedIoPage view={'sources-create'} />, withLayoutProps) 
    },
    { 
      path: routes.tenants.tenant.namespaces.namespace.io.sources.edit._.path,
      element: withLayout(
        <WithParams>
          {(params) => <RoutedIoPage view={'sources-edit'} source={params.source} />}
        </WithParams>, withLayoutProps
      )
    },

    /* Tenants */
    { 
      path: routes.tenants.tenant.configuration._.path,
      element: withLayout(<RoutedTenantPage view={"configuration"} />, withLayoutProps)
    },
    {
      path: routes.tenants.tenant.createNamespace._.path,
      element: withLayout(<RoutedTenantPage view={"create-namespace"} />, withLayoutProps),
    },
    {
      path: routes.tenants.tenant.namespaces._.path,
      element: withLayout(<RoutedTenantPage view={"namespaces"} />, setScrollMode(withLayoutProps, "page-own")),
    },
  ];
  
  const paths = getRoutes({ withLayout: () => <></>, withLayoutProps: defaultWithLayoutProps })
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
  const currentRoute = paths.map((p) => matchPath(p || "", location.pathname)).find((m) => Boolean(m));

  const tenant: TreeNode | undefined =
    currentRoute?.params?.tenant === undefined ? undefined : { type: "tenant", name: currentRoute?.params?.tenant || "unknown" };
  const namespace: TreeNode | undefined =
    currentRoute?.params?.namespace === undefined ? undefined : { type: "namespace", name: currentRoute?.params?.namespace || "unknown" };
  const topicType: "persistent" | "non-persistent" = currentRoute?.params?.topicType as "persistent" | "non-persistent";
  const topic: TreeNode | undefined =
    topicType === undefined || currentRoute?.params?.topic === undefined
      ? undefined
      : { type: topicType === "persistent" ? "persistent-topic" : "non-persistent-topic", name: currentRoute?.params?.topic || "unknown" };

  const withLayoutProps: WithLayoutProps = {
    layout: {
      navigationTree: {
        selectedNodePath: [tenant, namespace, topic].filter((n) => n !== undefined) as TreeNode[],
      },
    },
  };

  return useRoutes(getRoutes({ withLayout, withLayoutProps }));
};

const RoutedIoPage = (props: { view: IoPageView, sink?: string, source?: string }) => {
  const { tenant, namespace } = useParams();
  return <IoPage tenant={tenant!} namespace={namespace!} view={props.view} sink={props.sink} source={props.source} />
}

const RoutedTenantPage = (props: { view: TenantPageView }) => {
  const { tenant } = useParams();
  return <TenantPage tenant={tenant!} view={props.view} />;
};

const RoutedNamespacePage = (props: { view: NamespacePageView }) => {
  const { tenant, namespace } = useParams();
  return <NamespacePage tenant={tenant!} namespace={namespace!} view={props.view} />;
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
      const _schemaVersion = schemaVersion === undefined ? undefined : parseInt(schemaVersion, 10);
      if (_schemaVersion === undefined) {
        navigate(
          routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema._.get({
            tenant: tenant!,
            namespace: namespace!,
            topic: topic!,
            topicType: topicType as "persistent" | "non-persistent",
          }),
        );
        return <></>;
      }
      view = { type: "schema-view", schemaVersion: _schemaVersion };
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

const WithParams = (props: { children: (params: Readonly<Params<string>>) => React.ReactElement }) => {
  const params = useParams();
  return props.children(params);
};

/**
 * XXX - Fix for use-query-params
 * https://github.com/pbeshai/use-query-params/issues/108#issuecomment-785209454
 * This is the main thing you need to use to adapt the react-router v6
 * API to what use-query-params expects.
 *
 * Pass this as the `ReactRouterRoute` prop to QueryParamProvider.
 */
const RouteAdapter = ({ children }: any) => {
  const navigate = useNavigate();
  const location = useLocation();

  const adaptedHistory = React.useMemo(
    () => ({
      replace(location: Location) {
        navigate(location, { replace: true, state: location.state });
      },
      push(location: Location) {
        navigate(location, { replace: false, state: location.state });
      },
    }),
    [navigate],
  );
  return children({ history: adaptedHistory, location });
};

const setScrollMode = (withLayoutProps: WithLayoutProps, scrollMode: WithLayoutProps["layout"]["scrollMode"]) => {
  return { ...withLayoutProps, layout: { ...withLayoutProps.layout, scrollMode } };
};

export default Router;
