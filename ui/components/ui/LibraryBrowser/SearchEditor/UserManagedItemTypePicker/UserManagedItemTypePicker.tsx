import React from 'react';
import s from './UserManagedItemTypePicker.module.css'
import Select from '../../../Select/Select';
import { UserManagedItemType } from '../../model/user-managed-items';

export type UserManagedItemTypePickerProps = {
  value: UserManagedItemType;
  onChange: (value: UserManagedItemType) => void;
  disabled?: boolean;
};

const UserManagedItemTypePicker: React.FC<UserManagedItemTypePickerProps> = (props) => {
  return (
    <div className={s.UserManagedItemTypePicker}>
      <Select<UserManagedItemType>
        value={props.value}
        onChange={props.onChange}
        list={[
          { type: 'item', title: 'Consumer Session Config', value: 'consumer-session-config' },
          { type: 'item', title: 'Producer Session Config', value: 'producer-session-config' },
          { type: 'item', title: 'Message Filter', value: 'message-filter' },
        ]}
        disabled={props.disabled}
      />
    </div>
  );
}

export default UserManagedItemTypePicker;
