import React from 'react';
import s from './LibraryBrowserPickButton.module.css'
import SmallButton from '../../../../SmallButton/SmallButton';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../modals';
import pickIcon from './pick.svg';
import { ManagedItem, ManagedItemType } from '../../../model/user-managed-items';
import { LibraryContext } from '../../../model/library-context';

export type LibraryBrowserPickButtonProps = {
  itemType: ManagedItemType;
  onPick: (item: ManagedItem) => void;
  libraryContext: LibraryContext;
};

const LibraryBrowserPickButton: React.FC<LibraryBrowserPickButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <div className={s.LibraryBrowserPickButton}>
      <SmallButton
        title='Load'
        type='regular'
        svgIcon={pickIcon}
        appearance='borderless-semitransparent'
        onClick={() => {
          const modal = mkLibraryBrowserModal({
            libraryBrowserProps: {
              mode: {
                type: 'pick',
                itemType: props.itemType,
                onPick: (item) => {
                  props.onPick(item);
                  modals.pop();
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

export default LibraryBrowserPickButton;
