import React from 'react';
import s from './Overview.module.css'

export type OverviewProps = {
  tenant: string;
  namespace: string;
};

const Overview: React.FC<OverviewProps> = (props) => {
  return (
    <div className={s.Overview}>
      namespace overview
    </div>
  );
}

export default Overview;
