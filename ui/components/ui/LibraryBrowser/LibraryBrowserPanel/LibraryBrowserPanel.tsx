import React, { useEffect } from 'react';
import s from './LibraryBrowserPanel.module.css'
import LibraryBrowserButtons from './LibraryBrowserButtons/LibraryBrowserButtons';
import { UserManagedItem, UserManagedItemType } from '../model/user-managed-items';
import { H3 } from '../../H/H';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { help } from './help';
import { useHover } from '../../../app/hooks/use-hover';

export type LibraryBrowserPanelProps = {
  itemType: UserManagedItemType;
  itemToSave: UserManagedItem | undefined;
  onPick: (item: UserManagedItem) => void;
  isForceShowButtons?: boolean;
};

const LibraryBrowserPanel: React.FC<LibraryBrowserPanelProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

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
              itemToSave={props.itemToSave}
              onPick={(item) => {
                props.onPick(item);
              }}
            />
          </div>
        )}
      </div>
      {props.itemToSave?.metadata.name && (
        <div className={s.ItemName}>
          <H3>
            {props.itemToSave === undefined ? 'Unnamed' : props.itemToSave.metadata.name}
          </H3>
        </div>
      )}
      {props.itemToSave?.metadata.descriptionMarkdown && (
        <div className={s.ItemDescription}>
          {props.itemToSave === undefined ? 'Empty description' : props.itemToSave.metadata.descriptionMarkdown}
        </div>
      )}
    </div>
  );
}

export default LibraryBrowserPanel;
