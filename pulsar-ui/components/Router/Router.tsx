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
import TopicPage from '../TopicPage/TopicPage';

const Router: React.FC = () => {
  const withLayout = (children: React.ReactNode) => <Layout>{children}</Layout>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          {/* Namespaces */}
          <Route index element={withLayout(<HomePage />)} />
          <Route path="tenants/:tenant/namespaces/:namespace" element={withLayout(<RoutedNamespacePage view='overview' />)} />
          <Route path="tenants/:tenant/namespaces/:namespace/policies" element={withLayout(<RoutedNamespacePage view='policies' />)} />
          <Route path="tenants/:tenant/namespaces/:namespace/delete-namespace" element={withLayout(<RoutedNamespacePage view='delete-namespace' />)} />
          <Route path="tenants/:tenant/namespaces/:namespace/create-topic" element={withLayout(<RoutedNamespacePage view='create-topic' />)} />

          {/* Tenants */}
          <Route path="tenants/:tenant/configuration" element={withLayout(<RouteTenantPage view={'configuration'} />)} />
          <Route path="tenants/:tenant/create-namespace" element={withLayout(<RouteTenantPage view={'create-namespace'} />)} />
          <Route path="tenants/:tenant/delete-tenant" element={withLayout(<RouteTenantPage view={'delete-tenant'} />)} />
          <Route path="tenants/:tenant" element={withLayout(<RouteTenantPage view={'overview'} />)} />
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

const RoutedTopicPage = () => {
  const { tenant, namespace, topic } = useParams();
  return <TopicPage tenant={tenant!} namespace={namespace!} topic={topic!} />
}

export default Router;
