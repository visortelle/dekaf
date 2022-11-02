import React from 'react';
import s from './MemorySizeInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { MemorySize, MemoryUnit, memoryUnits } from './types';
import { bytesToMemorySize, memorySizeToBytes } from './conversions';

export type MemorySizeInputProps = {
  // Bytes
  initialValue: number;
  onChange: (value: number) => void;
};

const MemorySizeInput: React.FC<MemorySizeInputProps> = (props) => {
  const [value, setValue] = React.useState<MemorySize>(bytesToMemorySize(props.initialValue));

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
            setValue(newValue);
            props.onChange(memorySizeToBytes(newValue));
          }}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput<MemoryUnit>
          list={memoryUnits.map(u => ({ type: 'item', value: u, title: u }))}
          onChange={(unit) => {
            const newValue: MemorySize = { ...value, unit: unit as MemoryUnit };
            setValue(newValue);
            props.onChange(memorySizeToBytes(newValue))
          }}
          value={value.unit}
        />
      </div>
    </div>
  );
}

export default MemorySizeInput;
