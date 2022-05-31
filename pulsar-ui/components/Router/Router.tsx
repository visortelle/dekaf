import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
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
          <Route path="tenants/:tenant/namespaces/:namespace/topics/:topic" element={withLayout(<TopicPage />)} />
          <Route path="tenants/:tenant/namespaces/:namespace" element={withLayout(<NamespacePage />)} />
          <Route path="tenants/:tenant" element={withLayout(<TenantPage />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
