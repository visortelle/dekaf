import React from 'react';
import s from './Console.module.css'
import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import { SessionConfig, SessionState } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/topic_pb';
import Producer from './Producer/Producer';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import closeIcon from '!!raw-loader!./close.svg';
import EnteringFromBottomDiv from '../../../ui/animations/EnteringFromBottomDiv';

export type ConsoleProps = {
  isShow: boolean;
  onClose: () => void;
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: SessionConfig;
  sessionState: SessionState;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  onSessionStateChange: (state: SessionState) => void;
};

const Console: React.FC<ConsoleProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState<'cursors' | 'producer'>('producer');

  return (
    <EnteringFromBottomDiv className={s.Console} isVisible={props.isShow} motionKey='consumer-console'>
      <div className={s.Tabs}>
        <div className={`${s.Tab} ${activeTab === 'producer' ? s.ActiveTab : ''}`} onClick={() => setActiveTab('producer')}>Producer</div>
        {/* <div className={`${s.Tab} ${activeTab === 'cursors' ? s.ActiveTab : ''}`} onClick={() => setActiveTab('cursors')}>Cursors</div> */}

        <div className={s.CloseConsole} title="Close" onClick={props.onClose}>
          <SvgIcon svg={closeIcon} />
        </div>
      </div>

      <TabContent isShow={activeTab === 'cursors'}>
        <CursorsTab {...props} />
      </TabContent>

      <TabContent isShow={activeTab === 'producer'}>
        <Producer
          preset={{
            topic: props.sessionConfig.topicsSelector.type === 'by-names' ? props.sessionConfig.topicsSelector.topics[0] : undefined,
            key: ''
          }}
        />
      </TabContent>


    </EnteringFromBottomDiv>
  );
}

type TabContentProps = {
  isShow: boolean;
  children: React.ReactNode;
}
const TabContent: React.FC<TabContentProps> = (props) => {
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
