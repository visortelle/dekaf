import React from 'react';
import s from './LocalPulsarConfigInput.module.css'
import { LocalPulsarConfig } from '../../main/api/local-pulsar/types';

export type LocalPulsarConfigInputProps = {
  value: LocalPulsarConfig,
  onChange: (v: LocalPulsarConfig) => void
};

const LocalPulsarConfigInput: React.FC<LocalPulsarConfigInputProps> = (props) => {
  return (
    <div className={s.LocalPulsarConfigInput}>

    </div>
  );
}

export default LocalPulsarConfigInput;
