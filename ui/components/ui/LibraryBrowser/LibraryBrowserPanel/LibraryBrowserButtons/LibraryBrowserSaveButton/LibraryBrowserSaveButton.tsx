import React from 'react';
import s from './LibraryBrowserSaveButton.module.css'
import SmallButton from '../../../../SmallButton/SmallButton';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../modals';
import saveIcon from './save.svg';
import { ManagedItem } from '../../../model/user-managed-items';
import { LibraryContext } from '../../../model/library-context';


export type LibraryBrowserSaveButtonProps = {
  itemToSave: ManagedItem | undefined;
  libraryContext: LibraryContext;
  onSave: (item: ManagedItem) => void;
};

const LibraryBrowserSaveButton: React.FC<LibraryBrowserSaveButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.LibraryBrowserSaveButton}>
      <SmallButton
        title='Save'
        type='regular'
        appearance='borderless-semitransparent'
        svgIcon={saveIcon}
        disabled={props.itemToSave === undefined}
        onClick={() => {
          if (props.itemToSave === undefined) {
            return;
          }

          const modal = mkLibraryBrowserModal({
            libraryBrowserProps: {
              mode: {
                type: 'save',
                item: props.itemToSave,
                onSave: (itemId) => {
                  modals.pop();
                  props.onSave(itemId);
                },
              },
              onCancel: modals.pop,
              libraryContext: props.libraryContext,
            }
          });

          modals.push(modal);
        }}
      />
    </div>
  );
}

export default LibraryBrowserSaveButton;
