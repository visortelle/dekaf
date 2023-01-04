import React from 'react';
import s from './Chart.module.css'
import BarChart from './charts/BarChart/BarChart';
import { MessageDescriptor } from '../../../types';

export type ChartProps = {
  type: 'bar',
  messages: MessageDescriptor[];
};

const Chart: React.FC<ChartProps> = (props) => {
  if (props.messages.length === 0) {
    return <div className={s.NoData}>No data to show.</div>;
  }

  return (
    <div className={s.Chart}>
      <BarChart data={props.messages} />
    </div>
  );
}

export default Chart;
