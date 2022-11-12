import React from 'react';
import s from './DurationInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { Duration, DurationUnit, durationUnits } from './types';
import { durationToSeconds, secondsToDuration } from './conversions';

export type DurationInputProps = {
  // Seconds
  initialValue: number;
  onChange: (seconds: number) => void;
};

const DurationInput: React.FC<DurationInputProps> = (props) => {
  const [value, setValue] = React.useState<Duration>(secondsToDuration(props.initialValue));

  return (
    <div className={s.DurationInput}>
      <div className={s.Value}>
        <Input
          type='number'
          inputProps={{ min: 0 }}
          value={value.value.toString()}
          onChange={(size) => {
            const newValue: Duration = { ...value, value: Number(size) };
            setValue(newValue);
            props.onChange(durationToSeconds(newValue))
          }}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput<DurationUnit>
          list={durationUnits.map(u => ({ type: 'item', value: u, title: u }))}
          onChange={(unit) => {
            const newValue: Duration = { ...value, unit: unit as DurationUnit };
            setValue(newValue);
            props.onChange(durationToSeconds(newValue))
          }}
          value={value.unit}
        />
      </div>
    </div>
  );
}

export default DurationInput;
