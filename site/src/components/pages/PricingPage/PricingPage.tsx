import React from 'react';
import Layout from '@theme/Layout';
import Heading from '../../ui/Heading/Heading';
import FeaturesSection from './FeaturesSection/FeaturesSection';

import style from './PricingPage.module.css';

const PricingPage: React.FC = () => {
  return (
    <Layout>
      <main className={style.pricingPage}>
        <Heading level={1}>Pricing</Heading>
        <FeaturesSection />
      </main>
    </Layout>
  );
};

export default PricingPage;
