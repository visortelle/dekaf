import React from 'react';
import s from './LibraryBrowserButtons.module.css'
import LibraryBrowserSaveButton from './LibraryBrowserSaveButton/LibraryBrowserSaveButton';
import LibraryBrowserPickButton from './LibraryBrowserPickButton/LibraryBrowserPickButton';
import { ManagedItem, ManagedItemType } from '../../model/user-managed-items';
import { LibraryContext } from '../../model/library-context';

export type LibraryBrowserButtonsProps = {
  itemType: ManagedItemType;
  itemToSave: ManagedItem | undefined;
  onPick: (item: ManagedItem) => void;
  onSave: (item: ManagedItem) => void;
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
