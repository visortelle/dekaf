import React from 'react';

import Producer from './Producer/Producer';
import Visualization from './Visualization/Visualization';
import MessagesExporter from './MessagesExporter/MessagesExporter';
import { MessageDescriptor, ConsumerSessionConfig, SessionState } from '../types';
import EnteringFromBottomDiv from '../../animations/EnteringFromBottomDiv';
import Tabs from '../../Tabs/Tabs';

import s from './Console.module.css'
import DebugLogs from './FilterLogs/FilterLogs';
import ExpressionInspector from './FilterRepl/FilterRepl';

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
  const [activeTab, setActiveTab] = React.useState<TabKey>('export');

  if (props.sessionConfig === undefined) {
    return null;
  }

  return (
    <EnteringFromBottomDiv
      className={`${s.Console} ${props.isShow ? s.VisibleConsole : ''}`}
      isVisible={props.isShow}
      motionKey='consumer-console'
    >
      <Tabs<TabKey>
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onClose={props.onClose}
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
                    key: props.sessionKey.toString()
                  }}
                />
              )
            }
          },
          'visualize': {
            title: 'Visualize',
            isRenderAlways: true,
            render: () => (
              <Visualization
                messages={props.messages}
                isVisible={activeTab === 'visualize'}
                sessionState={props.sessionState}
              />
            )
          },
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
          },
          'export': {
            title: 'Export',
            isRenderAlways: true,
            render: () => (
              <MessagesExporter
                messages={props.messages}
                sessionState={props.sessionState}
                isVisible={activeTab === 'export'}
              />
            )
          }
        }}
      />
    </EnteringFromBottomDiv>
  );
}

export default Console;
