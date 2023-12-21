import React from 'react';
import s from './LibraryBrowserButtons.module.css'
import LibraryBrowserSaveButton from './LibraryBrowserSaveButton/LibraryBrowserSaveButton';
import LibraryBrowserPickButton from './LibraryBrowserPickButton/LibraryBrowserPickButton';
import { ManagedItem, ManagedItemType } from '../../model/user-managed-items';
import { LibraryContext } from '../../model/library-context';
import addNameIcon from './add-name.svg';
import addDescriptionIcon from './add-description.svg';
import SmallButton from '../../../SmallButton/SmallButton';
import { cloneDeep } from 'lodash';
import { getReadableItemType } from '../../get-readable-item-type';

export type LibraryBrowserButtonsProps = {
  itemType: ManagedItemType;
  value: ManagedItem;
  onChange: (item: ManagedItem) => void;
  onSave: (item: ManagedItem) => void;
  onPick: (item: ManagedItem) => void;
  libraryContext: LibraryContext;
  isReadOnly?: boolean
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
        itemToSave={props.value}
        libraryContext={props.libraryContext}
        onSave={props.onSave}
      />

      {props.value.metadata.name.length === 0 && (
        <SmallButton
          type='regular'
          appearance='borderless-semitransparent'
          svgIcon={addNameIcon}
          onClick={() => {
            const newValue = cloneDeep(props.value);
            newValue.metadata.name = `New ${getReadableItemType(props.itemType)}`

            props.onChange(newValue);
          }}
          title="Add name"
        />
      )}

      {props.value.metadata.descriptionMarkdown.length === 0 && (
        <SmallButton
          type='regular'
          appearance='borderless-semitransparent'
          svgIcon={addDescriptionIcon}
          onClick={() => {
            const newValue = cloneDeep(props.value);
            newValue.metadata.descriptionMarkdown = `Library item description.`

            props.onChange(newValue);
          }}
          title="Add description"
        />
      )}
    </div>
  );
}

export default LibraryBrowserButtons;
