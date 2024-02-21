import React, { useMemo, useState } from 'react';
import s from './LibrarySidebar.module.css'
import Tabs from '../Tabs/Tabs';
import Notes from './Notes/Notes';
import { LibraryContext } from '../LibraryBrowser/model/library-context';
import objectHash from 'object-hash';
import NoData from '../NoData/NoData';
import Library from './Library/Library';

export type LibrarySidebarProps = {
  libraryContext: LibraryContext
};

type TabKey =
  'notes' |
  'library';

type ItemsCount = {
  notes: number | undefined,
  favorites: number | undefined,
  library: number | undefined
}

const LibrarySidebar: React.FC<LibrarySidebarProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('library');
  const [itemsCount, setItemsCount] = useState<ItemsCount>({
    notes: undefined,
    favorites: undefined,
    library: undefined,
  });

  const reactKey = useMemo(() => objectHash(props.libraryContext), [props.libraryContext]);

  return (
    <div className={s.Library}>
      <Tabs<TabKey>
        tabs={[
          {
            key: 'library',
            title: <span style={{ display: 'inline-flex', gap: '1ch' }}>📚 Library{itemsCount.library === undefined ? <NoData /> : <>&nbsp;<strong>{itemsCount.library}</strong></>}</span>,
            render: () => (
              <Library
                key={reactKey}
                libraryContext={props.libraryContext}
                onCount={(v) => setItemsCount(ic => ({ ...ic, library: v }))}
              />
            ),
            isRenderAlways: true,
          },
          {
            key: 'notes',
            title: <span style={{ display: 'inline-flex', gap: '1ch' }}>🗒 Notes{itemsCount.notes === undefined ? <NoData /> : <>&nbsp;<strong>{itemsCount.notes}</strong></>}</span>,
            render: () => (
              <Notes
                key={reactKey}
                libraryContext={props.libraryContext}
                onCount={(v) => setItemsCount(ic => ({ ...ic, notes: v }))}
                isVisible={activeTab === 'notes'}
              />
            ),
            isRenderAlways: true,
          },
          // 'favorites': {
          //   title: '⭐️ Favorites',
          //   render: () => <>favorites</>,
          //   isRenderAlways: true,
          // },
        ]}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      />
    </div>
  );
}

export default LibrarySidebar;
