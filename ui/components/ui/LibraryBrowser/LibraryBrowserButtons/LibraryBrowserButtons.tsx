import React from 'react';
import s from './LibraryBrowserButtons.module.css'
import LibraryBrowserSaveButton from './LibraryBrowserSaveButton/LibraryBrowserSaveButton';
import LibraryBrowserPickButton from './LibraryBrowserPickButton/LibraryBrowserPickButton';
import { LibraryItem, LibraryItemType } from '../types';

export type LibraryBrowserButtonsProps = {
  currentItem: LibraryItem;
  itemType: LibraryItemType;
  onPick: (item: LibraryItem) => void;
};

const LibraryBrowserButtons: React.FC<LibraryBrowserButtonsProps> = (props) => {
  return (
    <div className={s.LibraryBrowserButtons}>
      <LibraryBrowserPickButton
        itemType={props.itemType}
        onPick={props.onPick}
      />

      <LibraryBrowserSaveButton
        item={props.currentItem}
      />

    </div>
  );
}

export default LibraryBrowserButtons;
