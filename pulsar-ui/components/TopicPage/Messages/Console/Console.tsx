import React from 'react';
import s from './Console.module.css'
import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import { SessionConfig, SessionState } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/topic_pb';
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
  return (
    <EnteringFromBottomDiv className={s.Console} isVisible={props.isShow} motionKey='consumer-console'>
      <div className={s.Tabs}>
        <div className={s.Tab}>Cursors</div>
        {/* <div className={s.Tab}>Producer</div> */}
        <div className={s.CloseConsole} title="Close" onClick={props.onClose}>
          <SvgIcon svg={closeIcon} />
        </div>
      </div>
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
    </EnteringFromBottomDiv>
  );
}

export default Console;
