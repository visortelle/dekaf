import React from 'react';
import { LibraryContext } from '../../../../LibraryBrowser/model/library-context';
import { ManagedItemType } from '../../../../LibraryBrowser/model/user-managed-items';
import { useNavigate } from 'react-router';
import PickLibraryItemButton from '../../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserButtons/PickLibraryItemButton/PickLibraryItemButton';
import { ResourceMatcher } from '../../../../LibraryBrowser/model/resource-matchers';
import { navigateToConsumerSession } from '../../navigateToConsumerSession';

export type BrowseLibraryButtonProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext,
  availableForContexts: ResourceMatcher[],
  onItemCount: (count: number | undefined) => void,
  isHideSelectButton?: boolean
};

const BrowseLibraryButton: React.FC<BrowseLibraryButtonProps> = (props) => {
  const navigate = useNavigate();

  return (
    <PickLibraryItemButton
      itemType={props.itemType}
      libraryContext={props.libraryContext}
      availableForContexts={props.availableForContexts}
      onItemCount={props.onItemCount}
      isHideSelectButton={props.isHideSelectButton}
      onPick={(v) => {
        if (v.metadata.type === 'consumer-session-config') {
          navigateToConsumerSession({
            item: v,
            libraryContext: props.libraryContext,
            navigate
          });
        }
      }}
    />
  );
}

export default BrowseLibraryButton;
