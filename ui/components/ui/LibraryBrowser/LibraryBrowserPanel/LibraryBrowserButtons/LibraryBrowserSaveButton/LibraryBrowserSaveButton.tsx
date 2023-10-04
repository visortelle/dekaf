import React from 'react';
import s from './LibraryBrowserSaveButton.module.css'
import SmallButton from '../../../../SmallButton/SmallButton';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../modals';
import saveIcon from './save.svg';
import { UserManagedItem } from '../../../model/user-managed-items';


export type LibraryBrowserSaveButtonProps = {
  itemToSave: UserManagedItem | undefined;
};

const LibraryBrowserSaveButton: React.FC<LibraryBrowserSaveButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.LibraryBrowserSaveButton}>
      <SmallButton
        text='Save'
        type='primary'
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
              },
              onCancel: modals.pop,
            }
          });

          modals.push(modal);
        }}
      />
    </div>
  );
}

export default LibraryBrowserSaveButton;
