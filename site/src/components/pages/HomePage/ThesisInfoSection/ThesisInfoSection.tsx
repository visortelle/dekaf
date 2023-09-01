import React from 'react';
import Link from '@site/src/components/ui/Link/Link';
import Heading from '@site/src/components/ui/Heading/Heading';

import style from './ThesisInfoSection.module.css';

const ThesisInfoSection: React.FC = () => {
  return (
    <section className={style.thesisInfoSection}>
      <div className={style.thesisInfoBlock}>
        <Heading level={3} colored>
          Why may I need UI for Pulsar?
        </Heading>

        <ul className={style.thesisInfoList}>
          <li>
            Making Pulsar accessible to less-technical users may be beneficial.
            QA or Product Owner person may rapidly generate various event
            messages to observe how the system behaves in different scenarios.
          </li>
          <li>
            Regardless of whether a new Pulsar user has experience in event
            processing, a visual tool can help them grasp some of Pulsar's
            concepts more quickly. Finding a candidate with the right experience
            in a specific technology can often take months. Simplifying the
            learning curve for new technology could address this challenge and
            save precious time.
          </li>
          <li>
            It’s often useful to model a desired system in different ways before
            starting to code it. Thinking and exploring is much more efficient
            when you can quickly try different options.{' '}
          </li>
          <li>
            Even if your team has experience with Pulsar, utilizing UI tools is
            much faster than typing terminal commands. You may save significant
            amount of valuable developer’s time.
          </li>
          <li>
            Sometimes things don't go exactly as planned. Extra time spent on
            troubleshooting may cost your business a lot of money. In addition
            to standard monitoring tools, our UI helps to reduce these expenses
            by making many Pulsar inspections and operations much faster to do.
          </li>
        </ul>

        <Link href="" align="right">
          {'Tell us about your specific use-cases and desired feautres ->'}
        </Link>
      </div>
    </section>
  );
};

export default ThesisInfoSection;
