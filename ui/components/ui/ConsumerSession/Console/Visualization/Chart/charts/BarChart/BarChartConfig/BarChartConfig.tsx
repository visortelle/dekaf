import React from 'react';
import s from './BarChartConfig.module.css'

export type BarChartConfigProps = {};

const BarChartConfig: React.FC<BarChartConfigProps> = (props) => {
  return (
    <div className={s.BarChartConfig}>
      config
    </div>
  );
}

export default BarChartConfig;