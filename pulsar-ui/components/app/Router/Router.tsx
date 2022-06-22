import React from 'react';
import {
  BrowserRouter,
  useParams,
  useLocation,
  useRoutes,
  RouteObject,
  matchPath,
  useNavigate
} from "react-router-dom";
import { Location } from 'react-router-dom';
import Layout, { LayoutProps } from '../../ui/Layout/Layout';
import InstancePage from '../../InstancePage/InstancePage';
import TenantPage, { TenantPageView } from '../../TenantPage/TenantPage';
import NamespacePage, { NamespacePageView } from '../../NamespacePage/NamespacePage';
import TopicPage, { TopicPageView } from '../../TopicPage/TopicPage';
import { routes } from '../../routes';
import { TreeNode } from '../../NavigationTree/TreeView';
import { QueryParamProvider } from 'use-query-params';

type WithLayoutProps = { layout: Omit<LayoutProps, 'children'> };
type WithLayout = (children: React.ReactElement, props: WithLayoutProps) => React.ReactElement;
const defaultWithLayoutProps: WithLayoutProps = { layout: { navigationTree: { selectedNodePath: [] } } };

const Router: React.FC = () => {
  const withLayout: WithLayout = (children, props) => (
    <Layout {...props.layout}>
      {children}
    </Layout>
  );

  return (
    <BrowserRouter>
      <QueryParamProvider ReactRouterRoute={RouteAdapter}>
        <Routes withLayout={withLayout} />
      </QueryParamProvider>
    </BrowserRouter>
  );
}

const prepareRoutes = (): { paths: string[], getRoutes: (props: { withLayout: WithLayout, withLayoutProps: WithLayoutProps }) => RouteObject[] } => {
  const getRoutes = ({ withLayout, withLayoutProps }: { withLayout: WithLayout, withLayoutProps: WithLayoutProps }) => [
    /* Instance */
    { path: routes.instance._.path, element: withLayout(<InstancePage view='overview' />, withLayoutProps) },
    { path: routes.instance.configuration._.path, element: withLayout(<InstancePage view='configuration' />, withLayoutProps) },
    { path: routes.instance.brokerStats._.path, element: withLayout(<InstancePage view='broker-stats' />, withLayoutProps) },
    { path: routes.instance.tenants._.path, element: withLayout(<InstancePage view='tenants' />, withLayoutProps) },
    { path: routes.instance.createTenant._.path, element: withLayout(<InstancePage view='create-tenant' />, withLayoutProps) },

    /* Topics */
    { path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic._.path, element: withLayout(<RoutedTopicPage view='overview' />, withLayoutProps) },
    { path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.policies._.path, element: withLayout(<RoutedTopicPage view='policies' />, withLayoutProps) },
    { path: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.deleteTopic._.path, element: withLayout(<RoutedTopicPage view='delete-topic' />, withLayoutProps) },

    /* Namespaces */
    { path: routes.tenants.tenant.namespaces.namespace._.path, element: withLayout(<RoutedNamespacePage view='overview' />, withLayoutProps) },
    { path: routes.tenants.tenant.namespaces.namespace.policies._.path, element: withLayout(<RoutedNamespacePage view='policies' />, withLayoutProps) },
    { path: routes.tenants.tenant.namespaces.namespace.deleteNamespace._.path, element: withLayout(<RoutedNamespacePage view='delete-namespace' />, withLayoutProps) },
    { path: routes.tenants.tenant.namespaces.namespace.createTopic._.path, element: withLayout(<RoutedNamespacePage view='create-topic' />, withLayoutProps) },

    /* Tenants */
    { path: routes.tenants.tenant.configuration._.path, element: withLayout(<RouteTenantPage view={'configuration'} />, withLayoutProps) },
    { path: routes.tenants.tenant.createNamespace._.path, element: withLayout(<RouteTenantPage view={'create-namespace'} />, withLayoutProps) },
    { path: routes.tenants.tenant.deleteTenant._.path, element: withLayout(<RouteTenantPage view={'delete-tenant'} />, withLayoutProps) },
    { path: routes.tenants.tenant._.path, element: withLayout(<RouteTenantPage view={'overview'} />, withLayoutProps) }
  ];
  const paths = getRoutes({ withLayout: () => <></>, withLayoutProps: defaultWithLayoutProps }).map(ro => ro.path).filter(p => p !== undefined) as string[];

  return {
    paths,
    getRoutes
  }
}

const Routes: React.FC<{ withLayout: WithLayout }> = ({ withLayout }) => {
  const { paths, getRoutes } = prepareRoutes();

  const location = useLocation();
  const currentRoute = paths.map(p => matchPath(p || '', location.pathname)).find(m => Boolean(m));

  const tenant: TreeNode | undefined = currentRoute?.params?.tenant === undefined ? undefined : { type: 'tenant', name: currentRoute?.params?.tenant || 'unknown' };
  const namespace: TreeNode | undefined = currentRoute?.params?.namespace === undefined ? undefined : { type: 'namespace', name: currentRoute?.params?.namespace || 'unknown' };
  const topicType: 'persistent' | 'non-persistent' = currentRoute?.params?.topicType as 'persistent' | 'non-persistent';
  const topic: TreeNode | undefined = (topicType === undefined || currentRoute?.params?.topic === undefined) ? undefined : { type: topicType === 'persistent' ? 'persistent-topic' : 'non-persistent-topic', name: currentRoute?.params?.topic || 'unknown' };

  const withLayoutProps: WithLayoutProps = {
    layout: {
      navigationTree: {
        selectedNodePath: [tenant, namespace, topic].filter(n => n !== undefined) as TreeNode[]
      }
    }
  };

  return useRoutes(getRoutes({ withLayout, withLayoutProps }));
}

const RouteTenantPage = (props: { view: TenantPageView }) => {
  const { tenant } = useParams();
  return <TenantPage tenant={tenant!} view={props.view} />
}

const RoutedNamespacePage = (props: { view: NamespacePageView }) => {
  const { tenant, namespace } = useParams();
  return <NamespacePage tenant={tenant!} namespace={namespace!} view={props.view} />
}

const RoutedTopicPage = (props: { view: TopicPageView }) => {
  const { tenant, namespace, topic, topicType } = useParams();
  return <TopicPage tenant={tenant!} namespace={namespace!} topic={topic!} view={props.view} topicType={topicType as 'persistent' | 'non-persistent'} />
}

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
    [navigate]
  );
  return children({ history: adaptedHistory, location });
};

export default Router;
