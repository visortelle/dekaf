import React from 'react';
import s from './MemorySizeInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { MemorySize, MemoryUnit, memoryUnits } from './types';

export type MemorySizeInputProps = {
  value: MemorySize;
  onChange: (memorySize: MemorySize) => void;
};

const MemorySizeInput: React.FC<MemorySizeInputProps> = (props) => {
  return (
    <div className={s.MemorySizeInput}>
      <div className={s.Size}>
        <Input
          type='number'
          value={props.value.size.toString()}
          onChange={(size) => {
            const memorySize = { ...props.value, size: Number(size) };
            props.onChange(memorySize)
          }}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput<MemoryUnit>
          list={memoryUnits.map(u => ({ value: u, title: u }))}
          onChange={(unit) => {
            const memorySize = { ...props.value, unit: unit as MemoryUnit };
            props.onChange(memorySize)
          }}
          value={props.value.unit}
        />
      </div>
    </div>
  );
}

export default MemorySizeInput;
