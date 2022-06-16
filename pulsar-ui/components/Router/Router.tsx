import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useParams
} from "react-router-dom";
import Layout from '../Layout/Layout';
import HomePage from '../HomePage/HomePage';
import TenantPage, { TenantPageView } from '../TenantPage/TenantPage';
import NamespacePage, { NamespacePageView } from '../NamespacePage/NamespacePage';
import TopicPage, { TopicPageView } from '../TopicPage/TopicPage';
import { routes } from '../routes';

const Router: React.FC = () => {
  const withLayout = (children: React.ReactNode) => <Layout>{children}</Layout>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          {/* Topics */}
          <Route index element={withLayout(<HomePage />)} />
          <Route path={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic._.path} element={withLayout(<RoutedTopicPage view='overview' />)} />
          <Route path={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.policies._.path} element={withLayout(<RoutedTopicPage view='policies' />)} />
          <Route path={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.deleteTopic._.path} element={withLayout(<RoutedTopicPage view='delete-topic' />)} />

          {/* Namespaces */}
          <Route index element={withLayout(<HomePage />)} />
          <Route path={routes.tenants.tenant.namespaces.namespace._.path} element={withLayout(<RoutedNamespacePage view='overview' />)} />
          <Route path={routes.tenants.tenant.namespaces.namespace.policies._.path} element={withLayout(<RoutedNamespacePage view='policies' />)} />
          <Route path={routes.tenants.tenant.namespaces.namespace.deleteNamespace._.path} element={withLayout(<RoutedNamespacePage view='delete-namespace' />)} />
          <Route path={routes.tenants.tenant.namespaces.namespace.createTopic._.path} element={withLayout(<RoutedNamespacePage view='create-topic' />)} />

          {/* Tenants */}
          <Route path={routes.tenants.tenant.configuration._.path} element={withLayout(<RouteTenantPage view={'configuration'} />)} />
          <Route path={routes.tenants.tenant.createNamespace._.path} element={withLayout(<RouteTenantPage view={'create-namespace'} />)} />
          <Route path={routes.tenants.tenant.deleteTenant._.path} element={withLayout(<RouteTenantPage view={'delete-tenant'} />)} />
          <Route path={routes.tenants.tenant._.path} element={withLayout(<RouteTenantPage view={'overview'} />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
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

export default Router;
