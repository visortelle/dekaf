import React from 'react';
import s from './AccessModeInput.module.css'
import { AccessMode } from '../access-mode';
import Select from '../../../../../Select/Select';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';

export type AccessModeInputProps = {
  value: AccessMode,
  onChange: (v: AccessMode) => void
};

const AccessModeInput: React.FC<AccessModeInputProps> = (props) => {
  return (
    <div className={s.AccessModeInput}>
      <FormItem size='small'>
        <FormLabel content="Access Mode" />

        <Select<AccessMode>
          size='small'
          list={[
            { type: 'item', title: 'Shared', value: 'shared' },
            { type: 'item', title: 'Exclusive', value: 'exclusive' },
            { type: 'item', title: 'Wait For Exclusive', value: 'wait-for-exclusive' },
            { type: 'item', title: 'Exclusive With Fencing', value: 'exclusive-with-fencing' }
          ]}
          value={props.value}
          onChange={props.onChange}
        />
      </FormItem>
    </div>
  );
}

export default AccessModeInput;
