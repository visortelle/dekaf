import React from 'react';
import s from './ManagedItemTypePicker.module.css'
import Select from '../../../Select/Select';
import { ManagedItemType } from '../../model/user-managed-items';
import { getReadableItemType } from '../../get-readable-item-type';

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
          { type: 'item', title: getReadableItemType('consumer-session-config'), value: 'consumer-session-config' },
          { type: 'item', title: getReadableItemType('producer-session-config'), value: 'producer-session-config' },
          { type: 'item', title: getReadableItemType('message-filter'), value: 'message-filter' },
          { type: 'item', title: getReadableItemType('message-filter-chain'), value: 'message-filter-chain' },
        ]}
        isReadOnly={props.readOnly}
      />
    </div>
  );
}

export default ManagedItemTypePicker;
