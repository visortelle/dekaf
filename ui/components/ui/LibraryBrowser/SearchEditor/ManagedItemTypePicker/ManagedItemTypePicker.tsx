import React from 'react';
import s from './ManagedItemTypePicker.module.css'
import Select from '../../../Select/Select';
import { ManagedItemType } from '../../model/user-managed-items';

export type ManagedItemTypePickerProps = {
  value: ManagedItemType;
  onChange: (value: ManagedItemType) => void;
  readOnly?: boolean;
};

const ManagedItemTypePicker: React.FC<ManagedItemTypePickerProps> = (props) => {
  return (
    <div className={s.ManagedItemTypePicker}>
      <Select<ManagedItemType>
        value={props.value}
        onChange={props.onChange}
        list={[
          { type: 'item', title: 'Consumer Session Config', value: 'consumer-session-config' },
          { type: 'item', title: 'Producer Session Config', value: 'producer-session-config' },
          { type: 'item', title: 'Message Filter', value: 'message-filter' },
          { type: 'item', title: 'Message Filter Chain', value: 'message-filter-chain' },
        ]}
        disabled={props.readOnly}
      />
    </div>
  );
}

export default ManagedItemTypePicker;
