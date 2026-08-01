import React from 'react';

import Producer from './Producer/Producer';
import { MessageDescriptor, ConsumerSessionConfig, SessionState } from '../types';
import Tabs, { Tab } from '../../Tabs/Tabs';

import s from './Console.module.css'
import DebugLogs from './ContextLogs/ContextLogs';
import ExpressionInspector from './ContextRepl/ContextRepl';
import TopicPositions from './TopicPositions/TopicPositions';
import { LibraryContext } from '../../LibraryBrowser/model/library-context';

export type ConsoleProps = {
  isShow: boolean;
  onClose: () => void;
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: ConsumerSessionConfig | undefined;
  sessionState: SessionState;
  onSessionStateChange: (state: SessionState) => void;
  messages: MessageDescriptor[];
  consumerName: string;
  currentTopic: string | undefined;
  libraryContext: LibraryContext;
};

type TabKey = 'producer' | 'visualize' | 'context-logs' | 'context-repl' | 'export' | 'topic-positions';

const Console: React.FC<ConsoleProps> = (props) => {
  // Topic Positions leads and is the default: it is the tab that answers "where am I?", which
  // is the first question on an open session - and unlike 'producer' it exists on EVERY page
  // (the Produce tab only renders on topic pages, so a producer default pointed at a missing
  // tab everywhere else).
  const [activeTab, setActiveTab] = React.useState<TabKey>('topic-positions');

  if (props.sessionConfig === undefined) {
    return null;
  }

  let tabs: Tab<TabKey>[] = [
    {
      key: 'topic-positions',
      title: 'Topic Positions',
      testId: 'console-tab-topic-positions',
      // Rendered always, like its siblings - but it is handed `isVisible` and polls nothing
      // while hidden, which is what keeps a debug view off the broker for everyone not looking
      // at it.
      isRenderAlways: true,
      render: () => (
        <TopicPositions
          consumerName={props.consumerName}
          sessionState={props.sessionState}
          // BOTH gates: the tab being the selected one AND the panel being open. As the default
          // tab, selection alone is true from page load - without the isShow half this would
          // poll the broker with the panel shut, for every visitor of every session page.
          isVisible={props.isShow && activeTab === 'topic-positions'}
        />
      )
    }
  ];

  if (props.libraryContext.pulsarResource.type === 'topic') {
    tabs = tabs.concat([{
      key: 'producer',
      title: 'Produce',
      testId: 'console-tab-produce',
      isRenderAlways: true,
      render: () => {
        if (props.sessionConfig === undefined) {
          return;
        }

        return (
          <Producer
            preset={{
              topic: props.currentTopic,
              key: ''
            }}
          />
        )
      }
    }]);
  }

  tabs = tabs.concat([

    {
      key: 'context-repl',
      title: 'Context REPL',
      testId: 'console-tab-repl',
      isRenderAlways: true,
      render: () => (
        <ExpressionInspector
          consumerName={props.consumerName}
          sessionState={props.sessionState}
          isVisible={activeTab === 'context-repl'}
        />
      )
    },
    {
      key: 'context-logs',
      title: 'Context Logs',
      testId: 'console-tab-logs',
      isRenderAlways: true,
      render: () => (
        <DebugLogs
          messages={props.messages}
          sessionState={props.sessionState}
          isVisible={activeTab === 'context-logs'}
        />
      )
    }
  ]);

  return (
    <div className={`${s.Console} ${props.isShow ? s.VisibleConsole : ''}`}>
      <Tabs<TabKey>
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        tabs={tabs}
      />
    </div>
  );
}

export default Console;
