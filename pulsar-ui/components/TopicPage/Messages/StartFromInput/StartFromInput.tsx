import React from 'react';
import s from './StartFromInput.module.css'
import SelectInput from '../../../ui/ConfigurationTable/SelectInput/SelectInput';

export type StartFrom = { type: 'date', date: Date } | { type: 'timestamp', timestamp: number } | { type: 'earliest' } | { type: 'latest' }

export type StartFromInputProps = {
  value: StartFrom,
  onChange: (value: StartFrom) => void,
};

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  return (
    <div className={s.StartFromInput}>
      start from input
    </div>
  );
}

export default StartFromInput;
