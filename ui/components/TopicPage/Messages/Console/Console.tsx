import React from 'react';

import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import Producer from './Producer/Producer';
import Visualization from './Visualization/Visualization';
import MessagesExporter from './MessagesExporter/MessagesExporter';
import { MessageDescriptor, ConsumerSessionConfig, SessionState } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import EnteringFromBottomDiv from '../../../ui/animations/EnteringFromBottomDiv';
import Tabs from '../../../ui/Tabs/Tabs';

import s from './Console.module.css'
import DebugLogs from './FilterLogs/FilterLogs';
import ExpressionInspector from './FilterRepl/FilterRepl';
import NothingToShow from '../../../ui/NothingToShow/NothingToShow';

export type ConsoleProps = {
  isShow: boolean;
  onClose: () => void;
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: ConsumerSessionConfig | undefined;
  sessionState: SessionState;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  onSessionStateChange: (state: SessionState) => void;
  messages: MessageDescriptor[];
  consumerName: string;
};

type TabKey = 'producer' | 'cursors' | 'visualize' | 'filter-logs' | 'filter-repl' | 'export';

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
                    topic: props.sessionConfig.topicsSelector.type === 'single-topic-selector' ? props.sessionConfig.topicsSelector.topicFqns[0] : undefined,
                    key: ''
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
          'filter-repl': {
            title: 'Filter REPL',
            isRenderAlways: true,
            render: () => (
              <ExpressionInspector
                consumerName={props.consumerName}
                sessionState={props.sessionState}
                isVisible={activeTab === 'filter-repl'}
              />
            )
          },
          'filter-logs': {
            title: 'Filter logs',
            isRenderAlways: true,
            render: () => (
              <DebugLogs
                messages={props.messages}
                sessionState={props.sessionState}
                isVisible={activeTab === 'filter-logs'}
              />
            )
          },
          'cursors': {
            title: 'Cursors',
            isRenderAlways: true,
            render: () => (
              <CursorsTab {...props} />
            ),
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

const CursorsTab: React.FC<ConsoleProps> = (props) => {
  if (props.sessionConfig === undefined) {
    return null;
  }

  return (
    <>
      {!(props.sessionState === 'running' || props.sessionState === 'paused') && (
        <NothingToShow content={"Run session to see cursors list."} />
      )}
      {props.sessionConfig.topicsSelector.type === 'namespaced-regex-topic-selector' && (
        <>
          <div className={s.SubscriptionsCursors} style={{
            visibility: (props.sessionState === 'running' || props.sessionState === 'paused') ? 'visible' : 'hidden'
          }}>
            <SubscriptionsCursors
              sessionKey={props.sessionKey}
              sessionSubscriptionName={props.sessionSubscriptionName}
              sessionState={props.sessionState}
              sessionConfig={props.sessionConfig}
              onSessionStateChange={props.onSessionStateChange}
              selector={props.sessionConfig.topicsSelector.topicFqns.reduce((acc, topic) => ({ ...acc, [topic]: [props.sessionSubscriptionName] }), {})}
              topicsInternalStats={props.topicsInternalStats}
            />
          </div>
        </>
      )}
    </>
  );
}

export default Console;
