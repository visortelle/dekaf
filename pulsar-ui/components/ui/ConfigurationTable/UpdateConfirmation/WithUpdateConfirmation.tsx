import React from 'react';
import UpdateConfirmation from "./UpdateConfirmation";
import { isEqual } from 'lodash';

export type WithUpdateConfirmationProps<V> = {
  initialValue: V,
  onConfirm: (value: V) => Promise<void>,
  children: (props: { value: V, onChange: (v: V) => void }) => React.ReactNode,
  isEqual?: (a: V, b: V) => boolean,
};

function WithUpdateConfirmation<V>(props: WithUpdateConfirmationProps<V>): React.ReactElement {
  const [value, setValue] = React.useState<V>(props.initialValue);

  const isShowConfirmation = props.isEqual ? !props.isEqual(props.initialValue, value) : !isEqual(props.initialValue, value);
  const handleConfirm = () => props.onConfirm(value);

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleConfirm();
        }
      }}
    >
      {props.children({ value, onChange: setValue })}

      {isShowConfirmation && (
        <UpdateConfirmation
          onConfirm={handleConfirm}
          onReset={() => setValue(props.initialValue)}
        />
      )}
    </div>
  );
}

export default WithUpdateConfirmation;
