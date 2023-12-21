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

const Library: React.FC<LibraryProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('markdown-document');

  return (
    <div className={s.Library}>
      <Tabs<TabKey>
        tabs={{
          'markdown-document': {
            title: 'Notes 🗒️',
            render: () => (
              <Notes libraryContext={props.libraryContext} />
            )
          },
          'favorites': {
            title: 'Favorites ⭐️',
            render: () => <>favorites</>
          },
          'sessions': {
            title: 'Sessions 🎬',
            render: () => <>sessions</>
          },
          'library': {
            title: 'Library 📚',
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
