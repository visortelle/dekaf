import React, { useEffect } from 'react';
import s from './LibraryBrowserPanel.module.css'
import LibraryBrowserButtons from './LibraryBrowserButtons/LibraryBrowserButtons';
import { LibraryItem, LibraryItemType } from '../model/library';
import { H3 } from '../../H/H';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { help } from './help';
import { useHover } from '../../../app/hooks/use-hover';

export type LibraryBrowserPanelProps = {
  itemType: LibraryItemType;
  itemDescriptorToSave: LibraryItem['descriptor'] | undefined;
  onPick: (item: LibraryItem) => void;
  isForceShowButtons?: boolean;
};

type LibraryItemWithoutDescriptor = Omit<LibraryItem, 'descriptor'>;

const LibraryBrowserPanel: React.FC<LibraryBrowserPanelProps> = (props) => {
  const [itemToSaveWithoutDescriptor, setItemToSaveWithoutDescriptor] = React.useState<LibraryItemWithoutDescriptor | undefined>(undefined);
  const [hoverRef, isHovered] = useHover();

  const itemToSave = props.itemDescriptorToSave === undefined ? undefined : {
    ...itemToSaveWithoutDescriptor,
    descriptor: props.itemDescriptorToSave
  } as LibraryItem;

  return (
    <div className={s.LibraryBrowserPanel} ref={hoverRef}>
      <div style={{ display: 'inline-flex', position: 'relative' }}>
        <FormLabel
          content={(
            <strong>
              {props.itemType === 'consumer-session-config' && 'Consumer Session Config'}
              {props.itemType === 'message-filter' && 'Message Filter'}
              {props.itemType === 'message-filter-chain' && 'Message Filter Chain'}
            </strong>
          )}
          help={(
            <div>
              {props.itemType === 'message-filter-chain' && help.messageFilterChain}
              {props.itemType === 'consumer-session-config' && help.consumerSessionConfig}
              {props.itemType === 'message-filter' && help.messageFilter}
            </div>
          )}
        />
        {(isHovered || props.isForceShowButtons) && (
          <div className={s.Buttons}>
            <LibraryBrowserButtons
              itemType={props.itemType}
              itemToSave={itemToSave}
              onPick={(item) => {
                setItemToSaveWithoutDescriptor(item);
                props.onPick(item);
              }}
            />
          </div>
        )}
      </div>
      {itemToSave?.name && (
        <div className={s.ItemName}>
          <H3>
            {itemToSave === undefined ? 'Unnamed' : itemToSave.name}
          </H3>
        </div>
      )}
      {itemToSave?.descriptionMarkdown && (
        <div className={s.ItemDescription}>
          {itemToSave === undefined ? 'Empty description' : itemToSave.descriptionMarkdown}
        </div>
      )}
    </div>
  );
}

export default LibraryBrowserPanel;
