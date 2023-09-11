import React from 'react';
import s from './TagsPicker.module.css'
import ListInput from '../../../ConfigurationTable/ListInput/ListInput';

export type TagsPickerProps = {
  mode: 'edit' | 'readonly';
  onChange: (value: string[]) => void;
  value: string[];
};

const TagsPicker: React.FC<TagsPickerProps> = (props) => {
  return (
    <div className={s.TagsPicker}>
      <ListInput<string>
        value={[]}
        renderItem={(v) => <div>{v}</div>}
        onAdd={(v) => props.onChange([...props.value, v])}
        onRemove={

}

      />
    </div>
  );
}

export default TagsPicker;

