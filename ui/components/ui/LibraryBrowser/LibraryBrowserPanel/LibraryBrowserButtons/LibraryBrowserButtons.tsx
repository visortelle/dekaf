import React from 'react';
import s from './LibraryBrowserButtons.module.css'
import LibraryBrowserSaveButton from './LibraryBrowserSaveButton/LibraryBrowserSaveButton';
import LibraryBrowserPickButton from './LibraryBrowserPickButton/LibraryBrowserPickButton';
import { UserManagedItem, UserManagedItemType } from '../../model/user-managed-items';

export type LibraryBrowserButtonsProps = {
  itemType: UserManagedItemType;
  itemToSave: UserManagedItem | undefined;
  onPick: (item: UserManagedItem) => void;
};

const LibraryBrowserButtons: React.FC<LibraryBrowserButtonsProps> = (props) => {
  return (
    <div className={s.LibraryBrowserButtons}>
      <LibraryBrowserPickButton
        itemType={props.itemType}
        onPick={props.onPick}
      />

      <LibraryBrowserSaveButton
        itemToSave={props.itemToSave}
      />
    </div>
  );
}

export default LibraryBrowserButtons;
