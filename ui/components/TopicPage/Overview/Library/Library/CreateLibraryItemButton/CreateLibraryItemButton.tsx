import React, { useMemo } from 'react';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';
import { ManagedItemType } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { getReadableItemType } from '../../../../../ui/LibraryBrowser/get-readable-item-type';
import { getDefaultManagedItem } from '../../../../../ui/LibraryBrowser/default-library-items';
import LibraryBrowserSaveButton from '../../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserButtons/LibraryBrowserSaveButton/LibraryBrowserSaveButton';

export type CreateLibraryItemButtonProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext
};

const CreateLibraryItemButton: React.FC<CreateLibraryItemButtonProps> = (props) => {
  const itemToSave = useMemo(() => {
    const v = getDefaultManagedItem(props.itemType);
    v.metadata.name = `New ${getReadableItemType(props.itemType)}`

    return v;
  }, [props.itemType]);

  return (
    <LibraryBrowserSaveButton
      itemToSave={itemToSave}
      libraryContext={props.libraryContext}
      onSave={() => { }}
      appearance="create"
      button={{
        text: 'Create'
      }}
    />
  );
}

export default CreateLibraryItemButton;
