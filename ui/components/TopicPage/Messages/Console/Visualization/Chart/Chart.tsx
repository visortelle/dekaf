import React from 'react';
import s from './Chart.module.css'
import BarChart from './charts/BarChart/BarChart';

export type ChartProps = {};

const Chart: React.FC<ChartProps> = (props) => {
  return (
    <div className={s.Chart}>
      <BarChart />
    </div>
  );
}

export default Chart;
