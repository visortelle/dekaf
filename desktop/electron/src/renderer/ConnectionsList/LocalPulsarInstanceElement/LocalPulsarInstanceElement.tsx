import React from 'react';
import s from './LocalPulsarInstanceElement.module.css'
import { LocalPulsarInstance } from '../../../main/api/local-pulsar-instances/types';

export type LocalPulsarInstanceElementProps = {
  value: LocalPulsarInstance
};

const LocalPulsarInstanceElement: React.FC<LocalPulsarInstanceElementProps> = (props) => {
  return (
    <div className={s.LocalPulsarInstanceElement}>
      {JSON.stringify(props.value, null, 4)}
    </div>
  );
}

export default LocalPulsarInstanceElement;
