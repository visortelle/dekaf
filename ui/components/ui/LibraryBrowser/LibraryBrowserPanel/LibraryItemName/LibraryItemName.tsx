import React from 'react';
import s from './LibraryItemName.module.css'
import { H3 } from '../../../H/H';
import DeleteButton from '../../../DeleteButton/DeleteButton';
import RenameButton from '../../../RenameButton/RenameButton';

export type LibraryItemNameProps = {
  value: string,
  onChange: (v: string) => void,
  isReadOnly?: boolean
};

const LibraryItemName: React.FC<LibraryItemNameProps> = (props) => {
  return (
    <div className={s.LibraryItemName}>
      <H3>{props.value}</H3>
      {!props.isReadOnly && (
        <div className={s.Buttons}>
          <RenameButton
            modal={{
              id: 'rename-library-item',
              title: `Rename Library Item`
            }}
            initialValue={props.value}
            onConfirm={props.onChange}
          />
          <DeleteButton
            appearance='borderless-semitransparent'
            isHideText
            onClick={() => props.onChange('')}
            title="Remove library item name"
          />
        </div>
      )}
    </div>
  );
}

export default LibraryItemName;
