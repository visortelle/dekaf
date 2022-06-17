import React from 'react';
import s from './InstancePage.module.css'
import Overview from './Overview/Overview';
import Configuration from './Configuration/Configuration';
import Toolbar from '../ui/Toolbar/Toolbar';
import { routes } from '../routes';
import BrokerStats from './BrokerStats/BrokerStats';

export type InstancePageView = 'overview' | 'configuration' | 'broker-stats';
export type InstancePageProps = {
  view: InstancePageView;
};

const InstancePage: React.FC<InstancePageProps> = (props) => {
  return (
    <div className={s.Page}>
      <div className={s.PageContent}>
        <Toolbar
          buttons={[
            {
              linkTo: routes.instance._.get(),
              title: 'Overview',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.instance.configuration._.get(),
              title: 'Configuration',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.instance.brokerStats._.get(),
              title: 'Metrics',
              onClick: () => { },
              type: 'regular'
            },
          ]}
        />
      </div>

      {props.view === 'overview' && <Overview />}
      {props.view === 'configuration' && <Configuration />}
      {props.view === 'broker-stats' && <BrokerStats />}
    </div>
  );
}

export default InstancePage;

