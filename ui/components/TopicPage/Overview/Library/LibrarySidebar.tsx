import React, { useState } from 'react';
import s from './LibrarySidebar.module.css'
import Tabs from '../../../ui/Tabs/Tabs';
import Notes from './Notes/Notes';
import { LibraryContext } from '../../../ui/LibraryBrowser/model/library-context';
import Library from './Library/Library';

export type LibrarySidebarProps = {
  libraryContext: LibraryContext
};

type TabKey = 'notes' |
  'sessions' |
  'favorites' |
  'library';

type ItemsCount = {
  notes: number,
  favorites: number,
  sessions: number,
  library: number
}

const LibrarySidebar: React.FC<LibrarySidebarProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('notes');
  const [itemsCount, setItemsCount] = useState<ItemsCount>({
    notes: 0,
    favorites: 0,
    library: 0,
    sessions: 0
  });

  return (
    <div className={s.Library}>
      <Tabs<TabKey>
        tabs={{
          'notes': {
            title: <span>🗒 Notes <strong>{itemsCount.notes}</strong></span>,
            render: () => (
              <Notes
                libraryContext={props.libraryContext}
                onCount={(v) => setItemsCount(ic => ({ ...ic, notes: v }))}
              />
            ),
            isRenderAlways: true,
          },
          'sessions': {
            title: '🎬 Sessions',
            render: () => <>sessions</>,
            isRenderAlways: true,
          },
          'library': {
            title: <span>📚 Library <strong>{itemsCount.library}</strong></span>,
            render: () => (
              <Library
                libraryContext={props.libraryContext}
                onCount={(v) => setItemsCount(ic => ({ ...ic, library: v }))}
              />
            ),
            isRenderAlways: true,
          },
          'favorites': {
            title: '⭐️ Favorites',
            render: () => <>favorites</>,
            isRenderAlways: true,
          },
        }}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      />
    </div>
  );
}

export default LibrarySidebar;
