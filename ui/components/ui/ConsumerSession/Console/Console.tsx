import React from 'react';

import Producer from './Producer/Producer';
import { MessageDescriptor, ConsumerSessionConfig, SessionState } from '../types';
import Tabs from '../../Tabs/Tabs';

import s from './Console.module.css'
import DebugLogs from './ContextLogs/ContextLogs';
import ExpressionInspector from './ContextRepl/ContextRepl';

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
};

type TabKey = 'producer' | 'visualize' | 'context-logs' | 'context-repl' | 'export';

const Console: React.FC<ConsoleProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState<TabKey>('producer');

  if (props.sessionConfig === undefined) {
    return null;
  }

  return (
    <div className={`${s.Console} ${props.isShow ? s.VisibleConsole : ''}`}>
      <Tabs<TabKey>
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        tabs={{
          'producer': {
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
          },
          // 'visualize': {
          //   title: 'Visualize',
          //   isRenderAlways: true,
          //   render: () => (
          //     <Visualization
          //       messages={props.messages}
          //       isVisible={activeTab === 'visualize'}
          //       sessionState={props.sessionState}
          //     />
          //   )
          // },
          'context-repl': {
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
          'context-logs': {
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
        }}
      />
    </div>
  );
}

export default Console;
