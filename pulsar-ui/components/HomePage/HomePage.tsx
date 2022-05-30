import React, { useEffect } from 'react';
import s from './HomePage.module.css'
import Layout from '../Layout/Layout';

export type HomePageProps = {};

const HomePage: React.FC<HomePageProps> = (props) => {
  return (
    <div className={s.HomePage}>
      <Layout>

      </Layout>
    </div>
  );
}

export default HomePage;
