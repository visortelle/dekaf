import React from 'react';
import s from './ValueProjectionsInput.module.css'

export type ValueProjectionsInputProps = {};

const ValueProjectionsInput: React.FC<ValueProjectionsInputProps> = (props) => {
  return (
    <div className={s.ValueProjectionsInput}>
      value projections
    </div>
  );
}

export default ValueProjectionsInput;
