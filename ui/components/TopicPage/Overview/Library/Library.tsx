import React, { useState } from 'react';
import s from './Library.module.css'
import Tabs from '../../../ui/Tabs/Tabs';
import Notes from './Notes/Notes';
import { LibraryContext } from '../../../ui/LibraryBrowser/model/library-context';

export type LibraryProps = {
  libraryContext: LibraryContext
};

type TabKey = 'markdown-document' |
  'sessions' |
  'favorites' |
  'library';

type ItemsCount = {
  notes: number,
  favorites: number,
  sessions: number,
  library: number
}

const Library: React.FC<LibraryProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('markdown-document');
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
          'markdown-document': {
            title: <span>🗒 Notes <strong>{itemsCount.notes}</strong></span>,
            render: () => (
              <Notes
                libraryContext={props.libraryContext}
                onCount={(v) => setItemsCount(ic => ({ ...ic, notes: v }))}
              />
            )
          },
          'favorites': {
            title: '⭐️ Favorites',
            render: () => <>favorites</>
          },
          'sessions': {
            title: '🎬 Sessions',
            render: () => <>sessions</>
          },
          'library': {
            title: '📚 Library',
            render: () => <>library</>
          }
        }}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      />
    </div>
  );
}

export default Library;
