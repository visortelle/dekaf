import React from 'react';

import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { ShortDuration, ShortDurationUnit, shortDurationUnits } from './types';
import { durationToMilliseconds, millisecondsToDuration } from './conversions';

import s from '../DurationInput/DurationInput.module.css';

export type DurationInputProps = {
  initialValue: number;
  onChange: (seconds: number) => void;

  short?: boolean;
};

const ShortDurationInput: React.FC<DurationInputProps> = (props) => {
  const [value, setValue] = React.useState<ShortDuration>(millisecondsToDuration(props.initialValue));

  return (
    <div className={s.DurationInput}>
      <div className={s.Value}>
        <Input
          type='number'
          inputProps={{ min: 0 }}
          value={value.value.toString()}
          onChange={(size) => {
            const newValue: ShortDuration = { ...value, value: Number(size) };
            setValue(newValue);
            props.onChange(durationToMilliseconds(newValue))
          }}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput<ShortDurationUnit>
          list={shortDurationUnits.map(u => ({ type: 'item', value: u, title: u }))}
          onChange={(unit) => {
            const newValue: ShortDuration = { ...value, unit: unit as ShortDurationUnit };
            setValue(newValue);
            props.onChange(durationToMilliseconds(newValue))
          }}
          value={value.unit}
        />
      </div>
    </div>
  );
}

export default ShortDurationInput;
