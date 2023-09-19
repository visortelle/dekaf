import React, { useEffect } from 'react';
import s from './LibraryBrowserPanel.module.css'
import LibraryBrowserButtons from './LibraryBrowserButtons/LibraryBrowserButtons';
import { LibraryItem, LibraryItemType } from '../types';
import { H3 } from '../../H/H';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { help } from './help';

export type LibraryBrowserPanelProps = {
  itemType: LibraryItemType;
  onPick: (item: LibraryItem) => void;
};

const LibraryBrowserPanel: React.FC<LibraryBrowserPanelProps> = (props) => {
  const [currentItem, setCurrentItem] = React.useState<LibraryItem | undefined>(undefined);
  const [isShowButtons, setIsShowButtons] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return;
    }

    const onPointerEnter = () => {
      setIsShowButtons(true);
    };

    const onPointerLeave = () => {
      setIsShowButtons(false);
    };

    root.addEventListener('pointerenter', onPointerEnter);
    root.addEventListener('pointerleave', onPointerLeave);

    return () => {
      root.removeEventListener('pointerenter', onPointerEnter);
      root.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div className={s.LibraryBrowserPanel} ref={rootRef}>
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
        {isShowButtons && (
          <div className={s.Buttons}>
            <LibraryBrowserButtons
              currentItem={currentItem}
              itemType={props.itemType}
              onPick={props.onPick}
            />
          </div>
        )}
      </div>
      <div className={s.ItemName}>
        <H3>
          {currentItem === undefined ? 'Unnamed' : currentItem.name}
        </H3>
      </div>
      <div className={s.ItemDescription}>{currentItem === undefined ? 'Empty description' : currentItem.descriptionMarkdown}</div>
    </div>
  );
}

export default LibraryBrowserPanel;
