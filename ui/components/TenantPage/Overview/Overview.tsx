import React from 'react';
import s from './Overview.module.css'

export type OverviewProps = {};

const Overview: React.FC<OverviewProps> = (props) => {
  return (
    <div className={s.Namespaces}>
      Overview
    </div>
  );
}

export default Overview;
