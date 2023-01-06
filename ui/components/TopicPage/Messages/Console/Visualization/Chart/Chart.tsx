import React, { useMemo } from 'react';
import s from './Chart.module.css'
import BarChart from './charts/BarChart/BarChart';
import { MessageDescriptor } from '../../../types';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import MessageDetails from '../../../../Messages/Message/MessageDetails/MessageDetails';

export type ChartProps = {
  type: 'bar',
  messages: MessageDescriptor[];
};

const k = Math.random()
const Chart: React.FC<ChartProps> = (props) => {
  const modals = Modals.useContext();

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

  const showMessageDetails = (message: MessageDescriptor) => {
    modals.push({
      id: 'message-details',
      title: `Message details`,
      content: <MessageDetails message={message} />,
      styleMode: 'no-content-padding'
    })
  }

  return (
    <div className={s.Chart}>
      <BarChart<MessageDescriptor>
        data={props.messages}
        config={{
          dimensions,
          getLabel: (message) => message.uiIndex.toString(),
          name: 'My bar chart',
        }}
        onEntryClick={showMessageDetails}
      />
    </div>
  );
}

export default Chart;
