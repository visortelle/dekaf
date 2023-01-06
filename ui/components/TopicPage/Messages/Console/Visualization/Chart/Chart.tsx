import React, { useCallback, useMemo } from 'react';
import s from './Chart.module.css'
import _BarChart from './charts/BarChart/BarChart';
import { MessageDescriptor, SessionState } from '../../../types';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import MessageDetails from '../../../../Messages/Message/MessageDetails/MessageDetails';

export type ChartProps = {
  type: 'bar',
  messages: MessageDescriptor[];
  sessionState: SessionState
};

const BarChart = React.memo(_BarChart<MessageDescriptor>)

const k = Math.random()
const Chart: React.FC<ChartProps> = (props) => {
  const modals = Modals.useContext();

  const dimensions = useMemo(() => {
    return [
      { getValue: (entry: MessageDescriptor) => Number(entry.key), name: 'Dimension 1' },
      { getValue: (entry: MessageDescriptor) => entry.size === null ? null : entry.size * 1000000, name: 'Dimension 2' },
      { getValue: (entry: MessageDescriptor) => entry.size === null ? null : entry.size * 1000003, name: 'Dimension 3' },
      { getValue: (entry: MessageDescriptor) => entry.size === null ? null : entry.size * k * 1000007, name: 'Some new dim' }
    ]
  }, []);

  const showMessageDetails = useCallback((message: MessageDescriptor) => {
    modals.push({
      id: 'message-details',
      title: `Message details`,
      content: <MessageDetails message={message} />,
      styleMode: 'no-content-padding'
    })
  }, [modals]);

  const config = useMemo(() => {
    return {
      dimensions,
      getLabel: (message: MessageDescriptor) => message.index.toString(),
      name: 'My bar chart',
    }
  }, [dimensions]);

  if (props.messages.length === 0) {
    return <div className={s.NoData}>No data to show.</div>;
  }

  return (
    <div className={s.Chart}>
      <BarChart
        data={props.messages}
        config={config}
        isRealTime={props.sessionState === 'running'}
        onEntryClick={showMessageDetails}
      // tooltip={{
      //   callbacks: {
      //     beforeTitle: (context) => {
      //       return `#${props.data[context[0].dataIndex].index}`
      //     }
      //   }
      // }}
      />
    </div>
  );
}

export default Chart;
