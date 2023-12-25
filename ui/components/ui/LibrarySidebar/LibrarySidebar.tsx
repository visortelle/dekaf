import React, { useMemo, useState } from 'react';
import s from './LibrarySidebar.module.css'
import Tabs from '../Tabs/Tabs';
import Notes from './Notes/Notes';
import { LibraryContext } from '../LibraryBrowser/model/library-context';
import Library from './Library/Library';
import objectHash from 'object-hash';

export type LibrarySidebarProps = {
  libraryContext: LibraryContext
};

type TabKey =
  'notes' |
  'library';

type ItemsCount = {
  notes: number,
  favorites: number,
  library: number
}

const LibrarySidebar: React.FC<LibrarySidebarProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('notes');
  const [itemsCount, setItemsCount] = useState<ItemsCount>({
    notes: 0,
    favorites: 0,
    library: 0,
  });

  const reactKey = useMemo(() => objectHash(props.libraryContext), [props.libraryContext]);

  return (
    <div className={s.Library}>
      <Tabs<TabKey>
        tabs={{
          'notes': {
            title: <span>🗒 Notes <strong>{itemsCount.notes}</strong></span>,
            render: () => (
              <Notes
                key={reactKey}
                libraryContext={props.libraryContext}
                onCount={(v) => setItemsCount(ic => ({ ...ic, notes: v }))}
              />
            ),
            isRenderAlways: true,
          },
          'library': {
            title: <span>📚 Library <strong>{itemsCount.library}</strong></span>,
            render: () => (
              <Library
                key={reactKey}
                libraryContext={props.libraryContext}
                onCount={(v) => setItemsCount(ic => ({ ...ic, library: v }))}
              />
            ),
            isRenderAlways: true,
          },
          // 'favorites': {
          //   title: '⭐️ Favorites',
          //   render: () => <>favorites</>,
          //   isRenderAlways: true,
          // },
        }}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      />
    </div>
  );
}

export default LibrarySidebar;
