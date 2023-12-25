import React from 'react';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { ManagedItemType } from '../../../LibraryBrowser/model/user-managed-items';
import LibraryBrowserPickButton from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserButtons/LibraryBrowserPickButton/LibraryBrowserPickButton';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../LibraryBrowser/modals';
import { ResourceMatcher } from '../../../LibraryBrowser/model/resource-matchers';

export type BrowseLibraryButtonProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext,
  resourceMatchers: ResourceMatcher[]
};

const BrowseLibraryButton: React.FC<BrowseLibraryButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <LibraryBrowserPickButton
      itemType={props.itemType}
      libraryContext={props.libraryContext}
      libraryBrowser={{
        initialResourceMatchersOverride: props.resourceMatchers
      }}
      onPick={(v) => {
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
            libraryContext: props.libraryContext
          }
        });

        modals.push(modal);
      }}
      button={{
        text: 'Browse'
      }}
    />
  );
}

export default BrowseLibraryButton;
