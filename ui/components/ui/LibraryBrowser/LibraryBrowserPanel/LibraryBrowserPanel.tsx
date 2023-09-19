import React, { useEffect } from 'react';
import s from './LibraryBrowserPanel.module.css'
import LibraryBrowserButtons from './LibraryBrowserButtons/LibraryBrowserButtons';
import { LibraryItem, LibraryItemType } from '../types';
import { H3 } from '../../H/H';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';

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
      <div>
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
              {props.itemType === 'message-filter-chain' && "Filter chain is a list of filters that are sequentially applied to each message."}
            </div>

          )}

        />
        <div className={s.ItemName}>
          <H3>
            {currentItem === undefined ? 'Unnamed' : currentItem.name}
          </H3>
        </div>
        <div className={s.ItemDescription}>{currentItem === undefined ? 'Empty description' : currentItem.descriptionMarkdown}</div>
      </div>

      {isShowButtons && (
        <LibraryBrowserButtons
          currentItem={currentItem}
          itemType={props.itemType}
          onPick={props.onPick}
        />
      )}
    </div>
  );
}

export default LibraryBrowserPanel;
