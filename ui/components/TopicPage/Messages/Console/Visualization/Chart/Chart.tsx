import React from 'react';
import s from './Chart.module.css'
import BarChart from './charts/BarChart/BarChart';
import { MessageDescriptor } from '../../../types';

export type ChartProps = {
  type: 'bar',
  messages: MessageDescriptor[];
};

const Chart: React.FC<ChartProps> = (props) => {
  return (
    <div className={s.Chart}>
      <BarChart data={props.messages} />
    </div>
  );
}

export default Chart;
