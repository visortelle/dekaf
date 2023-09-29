import React from 'react';
import s from './LibraryBrowserSaveButton.module.css'
import SmallButton from '../../../../SmallButton/SmallButton';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../modals';
import { LibraryItem } from '../../../model/library';
import saveIcon from './save.svg';


export type LibraryBrowserSaveButtonProps = {
  itemToSave: LibraryItem | undefined;
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
                itemToSave: props.itemToSave,
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
