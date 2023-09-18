import React from 'react';
import s from './LibraryBrowserPickButton.module.css'
import SmallButton from '../../SmallButton/SmallButton';
import * as Modals from '../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../modals';
import { LibraryItemDescriptor, LibraryItemType } from '../types';

export type LibraryBrowserPickButtonProps = {
  itemType: LibraryItemType;
  onPick: (descriptor: LibraryItemDescriptor) => void;
};

const LibraryBrowserPickButton: React.FC<LibraryBrowserPickButtonProps> = (props) => {
  const { push } = Modals.useContext();

  return (
    <div className={s.LibraryBrowserPickButton}>
      <SmallButton
        text='Pick'
        onClick={() => {
          mkLibraryBrowserModal({
            libraryBrowserProps: {
              mode: {
                type: 'picker',
                itemType: props.itemType,
              }
            }
          });
        }}
      />
    </div>
  );
}

export default LibraryBrowserPickButton;
