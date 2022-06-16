import React from 'react';
import s from './DurationInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { Duration, DurationUnit, durationUnits } from './types';

export type DurationInputProps = {
  value: Duration;
  onChange: (duration: Duration) => void;
};

const DurationInput: React.FC<DurationInputProps> = (props) => {
  return (
    <div className={s.DurationInput}>
      <div className={s.Value}>
        <Input
          type='number'
          value={props.value.value.toString()}
          onChange={(size) => {
            const duration: Duration = { ...props.value, value: Number(size) };
            props.onChange(duration)
          }}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput<DurationUnit>
          list={durationUnits.map(u => ({ value: u, title: u }))}
          onChange={(unit) => {
            const duration: Duration = { ...props.value, unit: unit as DurationUnit };
            props.onChange(duration)
          }}
          value={props.value.unit}
        />
      </div>
    </div>
  );
}

export default DurationInput;
