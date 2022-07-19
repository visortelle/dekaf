import React from 'react';
import s from './Console.module.css'
import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import { SessionConfig, SessionState } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/topic_pb';

export type ConsoleProps = {
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: SessionConfig;
  sessionState: SessionState;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  onSessionStateChange: (state: SessionState) => void;
};

const Console: React.FC<ConsoleProps> = (props) => {
  return (
    <div className={s.Console}>
      <div className={s.Tabs}>
        <div className={s.Tab}>Cursors</div>
        {/* <div className={s.Tab}>Producer</div> */}
      </div>
      {props.sessionConfig.topicsSelector.type === 'by-names' && (
        <div className={s.SubscriptionsCursors}>
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
      )}
    </div>
  );
}

export default Console;
