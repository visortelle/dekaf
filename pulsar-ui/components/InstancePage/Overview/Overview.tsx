import React from 'react';
import InternalConfig from './InternalConfig/InternalConfig';
import HealthCheck from './HealthCheck/HealthCheck';
import Metrics from './Metrics/Metrics';
import s from './Overview.module.css'

const Overview: React.FC = () => {
  return (
    <div className={s.Overview}>
      <div className={s.Section}>
        <HealthCheck />
      </div>
      <div className={s.Section}>
        <InternalConfig />
      </div>
      <div className={s.Section}>
        <Metrics />
      </div>
    </div>
  );
}

export default Overview;
