import React from 'react';

import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import Producer from './Producer/Producer';
import Visualization from './Visualization/Visualization';
import DebugConsole from './DebugConsole/DebugConsole';
import { MessageDescriptor, SessionConfig, SessionState } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import EnteringFromBottomDiv from '../../../ui/animations/EnteringFromBottomDiv';

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

type TabName = 'producer' | 'cursors' | 'visualize' | 'debug-console' | 'export';

const Console: React.FC<ConsoleProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState<TabName>('visualize');

  return (
    <EnteringFromBottomDiv
      className={`${s.Console} ${props.isShow ? s.VisibleConsole : ''}`}
      isVisible={props.isShow}
      motionKey='consumer-console'
    >
      <div className={s.Tabs}>
        <div className={`${s.Tab} ${activeTab === 'producer' ? s.ActiveTab : ''}`} onClick={() => setActiveTab('producer')}>Produce</div>
        <div className={`${s.Tab} ${activeTab === 'visualize' ? s.ActiveTab : ''}`} onClick={() => setActiveTab('visualize')}>Visualize</div>
        <div className={`${s.Tab} ${activeTab === 'debug-console' ? s.ActiveTab : ''}`} onClick={() => setActiveTab('debug-console')}>Filters debugger</div>
        <div className={`${s.Tab} ${activeTab === 'cursors' ? s.ActiveTab : ''}`} onClick={() => setActiveTab('cursors')}>Cursors</div>
        <div className={`${s.Tab} ${activeTab === 'export' ? s.ActiveTab : ''}`} onClick={() => setActiveTab('export')}>Export</div>

        <div className={s.CloseConsole} title="Close" onClick={props.onClose}>
          <SvgIcon svg={closeIcon} />
        </div>
      </div>

      <TabContent isShow={activeTab === 'cursors'} isRenderAlways>
        <CursorsTab {...props} />
      </TabContent>

      <TabContent isShow={activeTab === 'visualize'} isRenderAlways>
        <Visualization
          messages={props.messages}
          isVisible={activeTab === 'visualize'}
          sessionState={props.sessionState}
        />
      </TabContent>

      <TabContent isShow={activeTab === 'producer'} isRenderAlways>
        <Producer
          preset={{
            topic: props.sessionConfig.topicsSelector.type === 'by-names' ? props.sessionConfig.topicsSelector.topics[0] : undefined,
            key: ''
          }}
        />
      </TabContent>

      <TabContent isShow={activeTab === 'debug-console'} isRenderAlways>
        <DebugConsole
          messages={props.messages}
          sessionState={props.sessionState}
          consumerName={props.consumerName}
          isVisible={activeTab === 'debug-console'}
        />
      </TabContent>

    </EnteringFromBottomDiv>
  );
}

type TabContentProps = {
  isShow: boolean;
  isRenderAlways?: boolean;
  children: React.ReactNode;
}
const TabContent: React.FC<TabContentProps> = (props) => {
  if (!props.isShow && !props.isRenderAlways) {
    return <></>;
  }

  return (
    <div style={{ display: props.isShow ? 'flex' : 'none', flex: '1', overflow: 'hidden' }}>
      {props.children}
    </div>
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
