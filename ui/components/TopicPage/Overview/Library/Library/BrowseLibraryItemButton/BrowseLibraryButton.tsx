import React, { useMemo, useState } from 'react';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';
import { ManagedItemType } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import LibraryBrowserPickButton from '../../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserButtons/LibraryBrowserPickButton/LibraryBrowserPickButton';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../../../ui/LibraryBrowser/modals';

export type BrowseLibraryButtonProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext
};

const BrowseLibraryButton: React.FC<BrowseLibraryButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <LibraryBrowserPickButton
      itemType={props.itemType}
      libraryContext={props.libraryContext}
      onPick={(v) => {
        console.log('pick', v);
        const modal = mkLibraryBrowserModal({
          libraryBrowserProps: {
            mode: {
              type: 'save',
              item: v,
              onSave: () => {
                modals.pop();
              },
              appearance: 'edit'
            },
            onCancel: modals.pop,
            libraryContext: props.libraryContext,
          }
        });

        console.log('MODAL', modal);
        modals.push(modal);
      }}
      button={{
        text: 'Browse'
      }}
    />
  );
}

export default BrowseLibraryButton;
