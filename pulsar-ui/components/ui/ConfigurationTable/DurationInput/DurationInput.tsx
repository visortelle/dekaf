import React from 'react';
import s from './DurationInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { Duration, DurationUnit, durationUnits } from './types';
import { durationToSeconds, secondsToDuration } from './conversions';

export type _DurationInputProps = {
  value: Duration;
  onChange: (duration: Duration) => void;
};

const _DurationInput: React.FC<_DurationInputProps> = (props) => {
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
          list={durationUnits.map(u => ({ type: 'item', value: u, title: u }))}
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

type DurationInputProps = {
  // Seconds
  value: number;
  onChange: (seconds: number) => void;
}

const DurationInput: React.FC<DurationInputProps> = (props) => {
  return (
    <_DurationInput
      value={secondsToDuration(props.value)}
      onChange={(duration) => props.onChange(durationToSeconds(duration))}
    />
  );

}

export default DurationInput;
