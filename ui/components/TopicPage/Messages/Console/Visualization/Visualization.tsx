import React from 'react';
import { MessageDescriptor } from '../../types';
import Chart from './Chart/Chart';
import s from './Visualization.module.css'
import { useDebounce } from 'use-debounce'

export type VisualizationProps = {
  messages: MessageDescriptor[];
  isAutoUpdateEnabled: boolean;
};

const Visualization: React.FC<VisualizationProps> = (props) => {
  const [messages] = useDebounce(
    props.messages,
    chooseDebounceDelay(props.messages.length),
    { maxWait: props.isAutoUpdateEnabled ? undefined : 3000 }
  );

  return (
    <div className={s.Visualization}>
      <div>
        <h2>Visualization</h2>
      </div>
      <Chart
        type='bar'
        messages={messages}
      />
    </div>
  );
}

function chooseDebounceDelay(itemsCount: number) {
  if (itemsCount > 5000) {
    return 3000;
  } else if (itemsCount > 1000) {
    return 1000;
  } else if (itemsCount > 500) {
    return 500;
  } else {
    return 100;
  }
}

export default Visualization;
