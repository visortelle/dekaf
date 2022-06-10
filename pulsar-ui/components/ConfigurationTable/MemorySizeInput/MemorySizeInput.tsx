import React from 'react';
import s from './MemorySizeInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';

const memoryUnits = ['M', 'G'] as const;
type MemoryUnit = typeof memoryUnits[number];

export type MemorySize = {
  size: number;
  unit: MemoryUnit;
}

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
          onChange={(size) => props.onChange({ ...props.value, size: Number(size) })}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput
          list={memoryUnits.map(u => ({ id: u, title: u }))}
          onChange={(unit) => props.onChange({ ...props.value, unit: unit as MemoryUnit })}
          value={props.value.unit}
        />
      </div>
    </div>
  );
}

export default MemorySizeInput;
