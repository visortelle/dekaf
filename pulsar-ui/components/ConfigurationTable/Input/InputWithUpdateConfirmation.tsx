import React, { useEffect, useState } from 'react';
import s from './InputWithUpdateConfirmation.module.css'
import Input, { InputProps } from './Input';
import UpdateConfirmation from '../UpdateConfirmation/UpdateConfirmation';

export type InputWithUpdateConfirmationProps = InputProps;

const InputWithUpdateConfirmation: React.FC<InputWithUpdateConfirmationProps> = (props) => {
  const [value, setValue] = useState<string>(props.value);

  useEffect(() => {
    setValue(() => props.value);
  }, [props.value]);

  const handleUpdate = () => props.onChange(value);

  return (
    <div
      className={s.InputWithUpdateButton}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleUpdate();
        }
      }}
    >
      <Input {...props} value={value} onChange={v => setValue(() => v)} />
      {props.value !== value && (
        <UpdateConfirmation
          onUpdate={handleUpdate}
          onReset={() => setValue(props.value)}
        />
      )}
    </div>
  );
}

export default InputWithUpdateConfirmation;
