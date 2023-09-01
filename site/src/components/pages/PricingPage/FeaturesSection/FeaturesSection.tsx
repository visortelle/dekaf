import React from 'react';
import FeaturesTable from '../FeaturesTable/FeaturesTable';
import { featuresList } from '../FeaturesTable/FeaturesList';

import style from './FeaturesSection.module.css';

const FeaturesSection: React.FC = () => {
  return (
    <section className={style.featuresSection}>
      <FeaturesTable groups={featuresList} />
    </section>
  );
};

export default FeaturesSection;
