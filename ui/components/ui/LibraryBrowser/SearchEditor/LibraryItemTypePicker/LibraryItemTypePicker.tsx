import React from 'react';
import s from './LibraryItemTypePicker.module.css'
import Select from '../../../Select/Select';
import { LibraryItemType } from '../../model/library';

export type LibraryItemTypePickerProps = {
  value: LibraryItemType;
  onChange: (value: LibraryItemType) => void;
  disabled?: boolean;
};

const LibraryItemTypePicker: React.FC<LibraryItemTypePickerProps> = (props) => {
  return (
    <div className={s.LibraryItemTypePicker}>
      <Select<LibraryItemType>
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

export default LibraryItemTypePicker;
