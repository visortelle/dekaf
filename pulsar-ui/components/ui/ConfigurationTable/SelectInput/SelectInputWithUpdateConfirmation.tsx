import React, { useEffect, useState } from 'react';
import SelectInput, { InputProps } from './SelectInput';
import UpdateConfirmation from '../UpdateConfirmation/UpdateConfirmation';

export type InputWithUpdateConfirmationProps<V> = InputProps<V>;

function InputWithUpdateConfirmation<V>(props: InputWithUpdateConfirmationProps<V>): React.ReactElement {
  const [value, setValue] = useState<V>(props.value);

  useEffect(() => {
    setValue(() => props.value);
  }, [props.value]);

  const handleConfirm = () => props.onChange(value);

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleConfirm();
        }
      }}
    >
      <SelectInput {...props} value={value} onChange={v => setValue(() => v)} />
      {props.value !== value && (
        <UpdateConfirmation
          onConfirm={handleConfirm}
          onReset={() => setValue(props.value)}
        />
      )}
    </div>
  );
}

export default InputWithUpdateConfirmation;

