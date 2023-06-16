import React from 'react';

import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import Producer from './Producer/Producer';
import Visualization from './Visualization/Visualization';
import DebugConsole from './DebugConsole/DebugConsole';
import MessagesExporter from './MessagesExporter/MessagesExporter';
import { MessageDescriptor, SessionConfig, SessionState } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import EnteringFromBottomDiv from '../../../ui/animations/EnteringFromBottomDiv';
import Tabs from '../../../ui/Tabs/Tabs';

import closeIcon from './close.svg';

import s from './Console.module.css'

export type ConsoleProps = {
  isShow: boolean;
  onClose: () => void;
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: SessionConfig;
  sessionState: SessionState;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  onSessionStateChange: (state: SessionState) => void;
  messages: MessageDescriptor[];
  consumerName: string;
};

type TabKey = 'producer' | 'cursors' | 'visualize' | 'debug-console' | 'export';

const Console: React.FC<ConsoleProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState<TabKey>('export');

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
            render: () => (
              <Producer
                preset={{
                  topic: props.sessionConfig.topicsSelector.type === 'by-names' ? props.sessionConfig.topicsSelector.topics[0] : undefined,
                  key: ''
                }}
              />
            )
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
          'debug-console': {
            title: 'Filter debugger',
            render: () => (
              <DebugConsole
                messages={props.messages}
                sessionState={props.sessionState}
                consumerName={props.consumerName}
                isVisible={activeTab === 'debug-console'}
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
  return (
    <>
      {!(props.sessionState === 'running' || props.sessionState === 'paused') && (
        <div className={s.NothingToShow}>Run session to see cursors list.</div>
      )}
      {props.sessionConfig.topicsSelector.type === 'by-names' && (
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
              selector={props.sessionConfig.topicsSelector.topics.reduce((acc, topic) => ({ ...acc, [topic]: [props.sessionSubscriptionName] }), {})}
              topicsInternalStats={props.topicsInternalStats}
            />
          </div>
        </>
      )}
    </>
  );
}

export default Console;
