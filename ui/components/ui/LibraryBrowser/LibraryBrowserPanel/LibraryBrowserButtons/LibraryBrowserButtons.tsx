import React from 'react';
import s from './LibraryBrowserButtons.module.css'
import LibraryBrowserSaveButton from './LibraryBrowserSaveButton/LibraryBrowserSaveButton';
import LibraryBrowserPickButton from './LibraryBrowserPickButton/LibraryBrowserPickButton';
import { UserManagedItem, UserManagedItemType } from '../../model/user-managed-items';
import { LibraryContext } from '../../model/library-context';

export type LibraryBrowserButtonsProps = {
  itemType: UserManagedItemType;
  itemToSave: UserManagedItem | undefined;
  onPick: (item: UserManagedItem) => void;
  onSave: (item: UserManagedItem) => void;
  libraryContext: LibraryContext;
};

const LibraryBrowserButtons: React.FC<LibraryBrowserButtonsProps> = (props) => {
  return (
    <div className={s.LibraryBrowserButtons}>
      <LibraryBrowserPickButton
        itemType={props.itemType}
        onPick={props.onPick}
        libraryContext={props.libraryContext}
      />

      <LibraryBrowserSaveButton
        itemToSave={props.itemToSave}
        libraryContext={props.libraryContext}
        onSave={props.onSave}
      />
    </div>
  );
}

export default LibraryBrowserButtons;
