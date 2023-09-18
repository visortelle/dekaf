import React from 'react';
import s from './LibraryBrowserSaveButton.module.css'
import SmallButton from '../../../SmallButton/SmallButton';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../modals';
import { LibraryItem } from '../../types';
import saveIcon from './save.svg';


export type LibraryBrowserSaveButtonProps = {
  item: LibraryItem;
};

const LibraryBrowserSaveButton: React.FC<LibraryBrowserSaveButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.LibraryBrowserSaveButton}>
      <SmallButton
        text='Save'
        type='regular'
        svgIcon={saveIcon}
        onClick={() => {
          const modal = mkLibraryBrowserModal({
            libraryBrowserProps: {
              mode: {
                type: 'save',
                item: props.item,
              }
            }
          });

          modals.push(modal);
        }}
      />
    </div>
  );
}

export default LibraryBrowserSaveButton;
