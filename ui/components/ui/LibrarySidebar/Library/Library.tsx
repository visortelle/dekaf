import React, { useState } from 'react';
import s from './Library.module.css'
import Tabs from '../../Tabs/Tabs';
import ConsumerSessions from './ConsumerSessions/ConsumerSessions';
import AllObjectTypes from './AllObjectTypes/AllObjectTypes';
import { LibraryContext } from '../../LibraryBrowser/model/library-context';

export type LibraryProps = {
  onCount: (n: number) => void,
  libraryContext: LibraryContext,
};

type TabKey = 'consumer-sessions' | 'all-object-types';

const Library: React.FC<LibraryProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('consumer-sessions');

  return (
    <div className={s.Library}>
      <Tabs<TabKey>
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        tabs={[
          {
            key: 'consumer-sessions',
            render: () => (
              <ConsumerSessions
                libraryContext={props.libraryContext}
              />
            ),
            title: 'Consumer Sessions'
          },
          {
            key: 'all-object-types',
            render: () => (
              <AllObjectTypes
                onCount={props.onCount}
                libraryContext={props.libraryContext}
              />
            ),
            title: 'All Items',
            isRenderAlways: true
          }
        ]}
      />
    </div>
  );
}

export default Library;
