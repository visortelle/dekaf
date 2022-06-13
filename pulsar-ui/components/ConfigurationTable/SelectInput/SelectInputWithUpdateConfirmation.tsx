import React, { useEffect, useState } from 'react';
import Input, { InputProps } from './SelectInput';
import UpdateConfirmation from '../UpdateConfirmation/UpdateConfirmation';

export type InputWithUpdateConfirmationProps<V> = InputProps<V>;

function InputWithUpdateConfirmation<V>(props: InputWithUpdateConfirmationProps<V>): React.ReactElement {
  const [value, setValue] = useState<V>(props.value);

  useEffect(() => {
    setValue(() => props.value);
  }, [props.value]);

  const handleUpdate = () => props.onChange(value);

  return (
    <div
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

