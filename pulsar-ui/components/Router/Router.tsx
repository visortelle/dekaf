import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useParams
} from "react-router-dom";
import Layout from '../Layout/Layout';
import HomePage from '../HomePage/HomePage';
import TenantPage from '../TenantPage/TenantPage';
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
          <Route path="tenants/:tenant" element={withLayout(<RouteTenantPage />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const RouteTenantPage = () => {
  const { tenant } = useParams();
  return <TenantPage tenant={tenant!} />
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
