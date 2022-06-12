import React, { useEffect, useState } from 'react';
import s from './InputWithUpdateButton.module.css'
import Input, { InputProps } from './Input';
import Button from '../../ui/Button/Button';

export type InputWithUpdateButtonProps = InputProps;

const InputWithUpdateButton: React.FC<InputWithUpdateButtonProps> = (props) => {
  const [value, setValue] = useState<string>(props.value);

  useEffect(() => {
    setValue(() => props.value);
  }, [props.value]);

  return (
    <div className={s.InputWithUpdateButton}>
      <Input {...props} value={value} onChange={v => setValue(() => v)} />
      {props.value !== value && (
        <div className={s.Buttons}>
          <Button type="regular" onClick={() => setValue(props.value)} title="Reset" />
          <Button type="primary" onClick={() => props.onChange(value)} title="Update" />
        </div>
      )}
    </div>
  );
}

export default InputWithUpdateButton;
