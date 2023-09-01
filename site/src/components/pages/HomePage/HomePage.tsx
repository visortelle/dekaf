import React from 'react';
import Layout from '@theme/Layout';
import LinksBlock from './LinksBlock/LinksBlock';
import VideoSection from './VideoSection/VideoSection';
import HeadingsSection from './HeadingsSection/HeadingsSection';
import ThesisInfoSection from './ThesisInfoSection/ThesisInfoSection';
import StructInfoSection from './StructInfoSection/StructInfoSection';

import style from './HomePage.module.css';

const HomePage: React.FC = () => {
  return (
    <Layout>
      <main className={style.homePage}>
        <HeadingsSection />
        <VideoSection />
        <ThesisInfoSection />
        <StructInfoSection />
        <LinksBlock />
      </main>
    </Layout>
  );
};

export default HomePage;
