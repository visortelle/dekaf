import React from 'react';
import s from './MemorySizeInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { MemorySize, MemoryUnit, memoryUnits } from './types';
import { bytesToMemorySize, memorySizeToBytes } from './conversions';
import * as Notifications from '../../../app/contexts/Notifications';
import * as I18n from '../../../app/contexts/I18n/I18n';

export type MemorySizeInputProps = {
  initialValue: number;
  onChange: (value: number) => void;
  maxLimitBytes?: number;
};

const MemorySizeInput: React.FC<MemorySizeInputProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { formatLongNumber } = I18n.useContext();

  const [value, setValue] = React.useState<MemorySize>(bytesToMemorySize(props.initialValue));

  const onChange = (newValue: MemorySize) => {
    if (props.maxLimitBytes !== undefined && memorySizeToBytes(newValue) > props.maxLimitBytes) {
      notifyError(`The maximum value should be less than ${formatLongNumber(props.maxLimitBytes)} bytes`);
      return;
    }

    setValue(newValue);
    props.onChange(Math.floor(memorySizeToBytes(newValue)));
  };

  return (
    <div className={s.MemorySizeInput}>
      <div className={s.Size}>
        <Input
          type='number'
          inputProps={{ min: 0 }}
          value={value.size.toString()}
          onChange={(size) => {
            if (value.unit === 'B' && size.toString().includes('.')) {
              return;
            }

            const newValue: MemorySize = { ...value, size: Number(size) };
            onChange(newValue);
          }}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput<MemoryUnit>
          list={memoryUnits.map(u => ({ type: 'item', value: u, title: u }))}
          onChange={(unit) => {
            const newValue: MemorySize = { ...value, unit: unit as MemoryUnit };
            onChange(newValue);
          }}
          value={value.unit}
        />
      </div>
    </div>
  );
}

export const maxInt32 = 2_147_483_647;
export const maxInt64 = 9_223_372_036_854_775_807;

export default MemorySizeInput;
