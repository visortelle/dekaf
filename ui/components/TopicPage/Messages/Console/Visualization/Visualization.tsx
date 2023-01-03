import React from 'react';
import { MessageDescriptor } from '../../types';
import Chart from './Chart/Chart';
import s from './Visualization.module.css'

export type VisualizationProps = {
  messages: MessageDescriptor[];
};

const Visualization: React.FC<VisualizationProps> = (props) => {
  return (
    <div className={s.Visualization}>
      <div>
        <h2>Visualization</h2>
      </div>
      <Chart />
    </div>
  );
}

export default Visualization;
