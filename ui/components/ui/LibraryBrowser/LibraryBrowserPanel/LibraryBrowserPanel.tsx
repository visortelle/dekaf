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
              {props.itemType === 'message-filter-chain' && (
                <div>
                  <p>
                    <strong>Message Filter Chain</strong> is a list of filters that are sequentially applied to each message.
                  </p>

                  <p>
                    You can save it to <strong>Library</strong> and reuse later.
                  </p>
                </div>
              )}
              {props.itemType === 'consumer-session-config' && (
                <div>
                  <p>
                    <strong>Consumer Session Config</strong> is a set of configuration parameters like:
                  </p>

                  <ul>
                    <li>Start From</li>
                    <li>Message Filter Chain</li>
                    <li>etc...</li>
                  </ul>

                  <p>
                    You can save it to <strong>Library</strong> and reuse later.
                  </p>
                </div>
              )}
              {props.itemType === 'message-filter' && (
                <div>
                  <p>
                    <strong>Message Filter</strong> allows you to find messages in a topic.

                    <ul>
                      <li>
                        Use <strong>Basic Filter</strong> if you aren't familiar with writing code, or just want to filter messages by a simple condition.
                      </li>
                      <li>
                        Use <strong>JS Filter</strong> if you want for complex filtering.
                        <br /><br />
                        Additionally, JS filters support the <strong>Accumulator</strong> feature. It allows you to accumulate data from messages and make simple calculations. For example, you may want to calculate the median value of all new orders over last week; or count failure events grouped by it's reason.
                      </li>
                    </ul>
                  </p>

                  <p>
                    You can save it to <strong>Library</strong> and reuse later.
                  </p>
                </div>
              )}
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
