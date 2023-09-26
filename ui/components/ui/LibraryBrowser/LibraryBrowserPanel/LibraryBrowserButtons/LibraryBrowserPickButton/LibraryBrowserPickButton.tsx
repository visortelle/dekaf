import React from 'react';
import s from './LibraryBrowserPickButton.module.css'
import SmallButton from '../../../../SmallButton/SmallButton';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../modals';
import { LibraryItem, LibraryItemType } from '../../../types';
import pickIcon from './pick.svg';

export type LibraryBrowserPickButtonProps = {
  itemType: LibraryItemType;
  onPick: (item: LibraryItem) => void;
};

const LibraryBrowserPickButton: React.FC<LibraryBrowserPickButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.LibraryBrowserPickButton}>
      <SmallButton
        text='Select'
        type='regular'
        svgIcon={pickIcon}
        onClick={() => {
          const modal = mkLibraryBrowserModal({
            libraryBrowserProps: {
              mode: {
                type: 'pick',
                itemTypeToPick: props.itemType,
                onPick: props.onPick
              }
            }
          });

          modals.push(modal);
        }}
      />
    </div>
  );
}

export default LibraryBrowserPickButton;
