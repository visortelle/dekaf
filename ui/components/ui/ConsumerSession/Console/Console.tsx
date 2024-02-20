import React from 'react';

import Producer from './Producer/Producer';
import { MessageDescriptor, ConsumerSessionConfig, SessionState } from '../types';
import Tabs, { Tab } from '../../Tabs/Tabs';

import s from './Console.module.css'
import DebugLogs from './ContextLogs/ContextLogs';
import ExpressionInspector from './ContextRepl/ContextRepl';
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

type TabKey = 'producer' | 'visualize' | 'context-logs' | 'context-repl' | 'export';

const Console: React.FC<ConsoleProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState<TabKey>('producer');

  if (props.sessionConfig === undefined) {
    return null;
  }

  let tabs: Tab<TabKey>[] = [];

  if (props.libraryContext.pulsarResource.type === 'topic') {
    tabs = tabs.concat([{
      key: 'producer',
      title: 'Produce',
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
