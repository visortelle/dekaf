import React from 'react';
import InternalConfig from './InternalConfig/InternalConfig';
import HealthCheck from './HealthCheck/HealthCheck';
import Metrics from './Metrics/Metrics';
import s from './Overview.module.css'

const Overview: React.FC = () => {
  return (
    <div className={s.Overview}>
      <div className={s.Section}>
        <div className={s.SectionTitle}>Health check</div>
        <HealthCheck />
      </div>
      <div className={s.Section} style={{ marginRight: '48rem' }}>
        <div className={s.SectionTitle}>Internal configuration</div>
        <InternalConfig />
      </div>
      <div className={s.Section}>
        <div className={s.SectionTitle}>Metrics</div>
        <Metrics />
      </div>
    </div>
  );
}

export default Overview;
