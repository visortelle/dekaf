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
          { type: 'item', title: getReadableItemType('consumer-session-start-from'), value: 'consumer-session-start-from' },
          { type: 'item', title: getReadableItemType('coloring-rule'), value: 'coloring-rule' },
          { type: 'item', title: getReadableItemType('coloring-rule-chain'), value: 'coloring-rule-chain' },
          { type: 'item', title: getReadableItemType('markdown-document'), value: 'markdown-document' },
          { type: 'item', title: getReadableItemType('topic-selector'), value: 'topic-selector' },
          { type: 'item', title: getReadableItemType('consumer-session-target'), value: 'consumer-session-target' },
          { type: 'item', title: getReadableItemType('basic-message-filter-target'), value: 'basic-message-filter-target' },
          { type: 'item', title: getReadableItemType('value-projection'), value: 'value-projection' },
          { type: 'item', title: getReadableItemType('value-projection-list'), value: 'value-projection-list' },
          { type: 'item', title: getReadableItemType('deserializer'), value: 'deserializer' },
        ]}
        isReadOnly={props.readOnly}
      />
    </div>
  );
}

export default ManagedItemTypePicker;
