import React from 'react';
import s from './Console.module.css'
import SubscriptionsCursors from './SubscriptionsCursors/SubscriptionsCursors';
import { SessionConfig } from '../types';

export type ConsoleProps = {
  sessionSubscriptionName: string;
  sessionConfig: SessionConfig;
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
            selector={props.sessionConfig.topicsSelector.topics.reduce((acc, topic) => ({ ...acc, [topic]: [props.sessionSubscriptionName] }), {})}
          />
        </div>
      )}
    </div>
  );
}

export default Console;
