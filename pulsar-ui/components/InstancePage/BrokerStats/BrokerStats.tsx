import React from 'react';
import Metrics from './Metrics/Metrics';
import s from './BrokerStats.module.css'

export type OverviewProps = {};

const Overview: React.FC<OverviewProps> = (props) => {
  return (
    <div className={s.BrokerStats}>
      <div className={s.Section}>
        <Metrics />
      </div>
    </div>
  );
}

export default Overview;
