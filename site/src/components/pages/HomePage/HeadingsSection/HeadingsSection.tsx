import React from 'react';
import Links from '../LinksBlock/LinksBlock';
import Heading from '@site/src/components/ui/Heading/Heading';

import style from './HeadingsSection.module.css';

const HeadingsSection: React.FC = () => {
  return (
    <section className={style.headingsSection}>
      <div className={style.headingsContainer}>
        <Heading level={1} align="center">
          <span className={style.headingColored}>Apache Pulsar</span> made
          simple
        </Heading>

        <Heading level={3} align="center">
          Equip your team with a top-notch UI tool and unleash the full power of
          Pulsar
        </Heading>
      </div>

      <Links />
    </section>
  );
};

export default HeadingsSection;
