import React, { useState } from 'react';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { ManagedItemType } from '../../../LibraryBrowser/model/user-managed-items';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../LibraryBrowser/modals';
import { ResourceMatcher } from '../../../LibraryBrowser/model/resource-matchers';
import SmallButton from '../../../SmallButton/SmallButton';
import { v4 as uuid } from 'uuid';
import LibraryBrowser, { LibraryBrowserProps } from '../../../LibraryBrowser/LibraryBrowser';
import browseIcon from './browse.svg';

export type BrowseLibraryButtonProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext,
  resourceMatchers: ResourceMatcher[]
};

const BrowseLibraryButton: React.FC<BrowseLibraryButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <SmallButton
      type='regular'
      appearance='borderless-semitransparent'
      text='Browse'
      svgIcon={browseIcon}
      onClick={() => {
        modals.push({
          id: `browser-library-${uuid()}`,
          title: `Browse Library`,
          content: (
            <BrowseLibraryButtonModal {...props} />
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

export const BrowseLibraryButtonModal: React.FC<BrowseLibraryButtonProps> = (props) => {
  const modals = Modals.useContext();
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  let extraButtons: LibraryBrowserProps['extraButtons'] = [{
    id: 'edit',
    button: {
      type: 'regular',
      text: 'Edit',
      disabled: selectedItemId === undefined
    },

    onClick: (v) => {
      const modal = mkLibraryBrowserModal({
        libraryBrowserProps: {
          mode: {
            type: 'save',
            item: v.spec,
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
    }
  }];

  if (props.itemType === 'consumer-session-config') {
    extraButtons = extraButtons.concat([
      {
        id: 'open-consumer-session',
        button: {
          type: 'primary',
          text: 'Open',
          disabled: selectedItemId === undefined
        },
        onClick: (v) => {

        }
      }
    ]);
  }

  return (
    <LibraryBrowser
      mode={{
        type: 'pick',
        itemType: props.itemType,
      }}
      onCancel={modals.pop}
      libraryContext={props.libraryContext}
      initialResourceMatchersOverride={props.resourceMatchers}
      onSelectedItemIdChange={setSelectedItemId}
      extraButtons={extraButtons}
    />
  );
}

export default BrowseLibraryButton;
