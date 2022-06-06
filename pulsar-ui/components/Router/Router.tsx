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
import NamespacePage from '../NamespacePage/NamespacePage';
import TopicPage from '../TopicPage/TopicPage';

const Router: React.FC = () => {
  const withLayout = (children: React.ReactNode) => <Layout>{children}</Layout>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={withLayout(<HomePage />)} />
          <Route path="tenants/:tenant/namespaces/:namespace/topics/:topic" element={withLayout(<RoutedTopicPage />)} />
          <Route path="tenants/:tenant/namespaces/:namespace" element={withLayout(<RoutedNamespacePage />)} />
          <Route path="tenants/:tenant/namespaces" element={withLayout(<RouteTenantPage view={'namespaces'} />)} />
          <Route path="tenants/:tenant/configuration" element={withLayout(<RouteTenantPage view={'configuration'} />)} />
          <Route path="tenants/:tenant/create-namespace" element={withLayout(<RouteTenantPage view={'create-namespace'} />)} />
          <Route path="tenants/:tenant/delete-tenant" element={withLayout(<RouteTenantPage view={'delete-tenant'} />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const RouteTenantPage = (props: { view: TenantPageView }) => {
  const { tenant } = useParams();
  return <TenantPage tenant={tenant!} view={props.view} />
}
const RoutedNamespacePage = () => {
  const { tenant, namespace } = useParams();
  return <NamespacePage tenant={tenant!} namespace={namespace!} />
}

const RoutedTopicPage = () => {
  const { tenant, namespace, topic } = useParams();
  return <TopicPage tenant={tenant!} namespace={namespace!} topic={topic!} />
}

export default Router;
