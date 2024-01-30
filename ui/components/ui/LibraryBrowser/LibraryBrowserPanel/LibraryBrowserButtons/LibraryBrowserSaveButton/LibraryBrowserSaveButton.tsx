import React from 'react';
import s from './LibraryBrowserSaveButton.module.css'
import SmallButton, { SmallButtonProps } from '../../../../SmallButton/SmallButton';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import { mkLibraryBrowserModal } from '../../../modals';
import saveIcon from './save.svg';
import createIcon from './create.svg';
import editIcon from './edit.svg';
import { ManagedItem } from '../../../model/user-managed-items';
import { LibraryContext } from '../../../model/library-context';
import { capitalize } from 'lodash';

export type LibraryBrowserSaveButtonProps = {
  itemToSave: ManagedItem | undefined;
  libraryContext: LibraryContext;
  onSave: (item: ManagedItem) => void;
  button?: Partial<SmallButtonProps>;
  appearance?: 'save' | 'create' | 'edit'
};

const LibraryBrowserSaveButton: React.FC<LibraryBrowserSaveButtonProps> = (props) => {
  const modals = Modals.useContext();

  const buttonTitle = capitalize(props.appearance || 'save');

  let buttonIcon;
  switch (props.appearance) {
    case "create": buttonIcon = createIcon; break;
    case "edit": buttonIcon = editIcon; break;
    default: buttonIcon = saveIcon;
  }

  return (
    <div className={s.LibraryBrowserSaveButton}>
      <SmallButton
        title={buttonTitle}
        type='regular'
        appearance='borderless-semitransparent'
        svgIcon={buttonIcon}
        disabled={props.itemToSave === undefined}
        onClick={() => {
          if (props.itemToSave === undefined) {
            return;
          }

          const modal = mkLibraryBrowserModal({
            libraryBrowserProps: {
              mode: {
                type: 'save-item',
                initialManagedItem: props.itemToSave,
                onSave: (itemId) => {
                  modals.pop();
                  props.onSave(itemId);
                },
                appearance: props.appearance
              },
              onCancel: modals.pop,
              libraryContext: props.libraryContext,
            }
          });

          modals.push(modal);
        }}
        {...props.button}
      />
    </div>
  );
}

export default LibraryBrowserSaveButton;
