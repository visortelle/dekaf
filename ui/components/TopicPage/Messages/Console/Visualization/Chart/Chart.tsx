import React, { useMemo } from 'react';
import s from './Chart.module.css'
import BarChart from './charts/BarChart/BarChart';
import { MessageDescriptor } from '../../../types';

export type ChartProps = {
  type: 'bar',
  messages: MessageDescriptor[];
};

const k = Math.random()
const Chart: React.FC<ChartProps> = (props) => {
  if (props.messages.length === 0) {
    return <div className={s.NoData}>No data to show.</div>;
  }

  const dimensions = useMemo(() => {
    return [
      { getValue: (entry: MessageDescriptor) => Number(entry.key), name: 'Dimension 1' },
      { getValue: (entry: MessageDescriptor) => entry.size === null ? null : entry.size * 1000000, name: 'Dimension 2' },
      { getValue: (entry: MessageDescriptor) => entry.size === null ? null : entry.size * 1000003, name: 'Dimension 3' },
      { getValue: (entry: MessageDescriptor) => entry.size === null ? null : entry.size * k * 1000007, name: 'Some new dim' }
    ]
  }, []);

  return (
    <div className={s.Chart}>
      <BarChart<MessageDescriptor>
        data={props.messages}
        config={{
          dimensions,
          getLabel: (entry) => entry.publishTime === null ? '-' : new Date(entry.publishTime).toISOString(),
          name: 'My bar chart',
        }}
        onEntryClick={(entry) => console.log(entry)}
      />
    </div>
  );
}

export default Chart;
