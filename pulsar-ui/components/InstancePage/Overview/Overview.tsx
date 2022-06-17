import React from 'react';
import InternalConfig from './InternalConfig/InternalConfig';
import HealthCheck from './HealthCheck/HealthCheck';
import s from './Overview.module.css'

export type OverviewProps = {};

const Overview: React.FC<OverviewProps> = (props) => {
  return (
    <div className={s.Overview}>
      <div className={s.Section}>
        <HealthCheck />
      </div>
      <div className={s.Section}>
        <InternalConfig />
      </div>
    </div>
  );
}

export default Overview;
