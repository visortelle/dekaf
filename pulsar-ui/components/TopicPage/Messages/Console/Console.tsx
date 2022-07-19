import React from 'react';
import s from './Console.module.css'
import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import { SessionConfig, SessionState } from '../types';

export type ConsoleProps = {
  sessionKey: number;
  sessionSubscriptionName: string;
  sessionConfig: SessionConfig;
  sessionState: SessionState;
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
            sessionState={props.sessionState}
            onSessionStateChange={props.onSessionStateChange}
            selector={props.sessionConfig.topicsSelector.topics.reduce((acc, topic) => ({ ...acc, [topic]: [props.sessionSubscriptionName] }), {})}
          />
        </div>
      )}
    </div>
  );
}

export default Console;
