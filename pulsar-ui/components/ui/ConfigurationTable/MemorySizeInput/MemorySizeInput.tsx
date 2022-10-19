import React from 'react';
import s from './MemorySizeInput.module.css'
import SelectInput from '../SelectInput/SelectInput';
import Input from '../Input/Input';
import { MemorySize, MemoryUnit, memoryUnits } from './types';
import { bytesToMemorySize, memorySizeToBytes } from './conversions';

export type _MemorySizeInputProps = {
  value: MemorySize;
  onChange: (memorySize: MemorySize) => void;
};

const _MemorySizeInput: React.FC<_MemorySizeInputProps> = (props) => {
  return (
    <div className={s.MemorySizeInput}>
      <div className={s.Size}>
        <Input
          type='number'
          inputProps={{ min: 0 }}
          value={props.value.size.toString()}
          onChange={(size) => {
            if (props.value.unit === 'B' && size.toString().includes('.')) {
              return;
            }

            const memorySize: MemorySize = { ...props.value, size: Number(size) };
            props.onChange(memorySize)
          }}
        />
      </div>

      <div className={s.Unit}>
        <SelectInput<MemoryUnit>
          list={memoryUnits.map(u => ({ type: 'item', value: u, title: u }))}
          onChange={(unit) => {
            const memorySize: MemorySize = { ...props.value, unit: unit as MemoryUnit };
            props.onChange(memorySize)
          }}
          value={props.value.unit}
        />
      </div>
    </div>
  );
}

type MemorySizeInput = {
  // Bytes
  value: number;
  onChange: (bytes: number) => void;
}

const MemorySizeInput: React.FC<MemorySizeInput> = (props) => {
  return (
  <_MemorySizeInput
    value={bytesToMemorySize(props.value)}
    onChange={(memorySize) => props.onChange(memorySizeToBytes(memorySize))}
  />
  );
}

export default MemorySizeInput;
