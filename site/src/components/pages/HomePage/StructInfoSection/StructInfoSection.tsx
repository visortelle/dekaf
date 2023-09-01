import React from 'react';
import Link from '@site/src/components/ui/Link/Link';
import Heading from '@site/src/components/ui/Heading/Heading';

import style from './StructInfoSection.module.css';

const StructInfoSection: React.FC = () => {
  return (
    <section className={style.structInfoSection}>
      <div className={style.structInfoBlock}>
        <div className={style.headingsContainer}>
          <Heading level={2} align="center">
            Seamlessly navigate over Pulsar resources
          </Heading>

          <Heading level={3} align="center">
            Find a needle in a haystack using powerful message filters
          </Heading>
        </div>

        <div className={style.columnsContainer}>
          <div className={style.column}>
            <p>
              Pulsar is a multi-tenant system and it’s resources are organized
              as a hierarchical structure.
            </p>

            <p>
              We found it’s a natural to display this structure as a tree at the
              left sidebar.
            </p>

            <img src="/img/img_struct_side.png" alt="Side navigation" />
          </div>

          <div className={style.column}>
            <img src="/img/img_struct_top.png" alt="Top menu" />

            <p>
              With breadcrumbs at the top of a page, you always know where you
              are now and can navigate back to any ancestor resource.
            </p>

            <img src="/img/img_struct_main.png" alt="Main view" />
            <p>Observe a list of children resources and their metrics.</p>

            <p>
              A combination of these navigation elements make it very easy to
              understand your Pulsar instance structure.
            </p>
          </div>
        </div>

        <Link href="" align="right">
          {'Learn how to navigate over Pulsar resources ->'}
        </Link>
      </div>
    </section>
  );
};

export default StructInfoSection;
