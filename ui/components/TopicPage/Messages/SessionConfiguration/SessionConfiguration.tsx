import React from 'react';

import StartFromInput from './StartFromInput/StartFromInput';
import FilterChain from './MessageFilterInput/FilterChain';
import { SessionConfig } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';

import s from './SessionConfiguration.module.css'

export type SessionConfigurationProps = {
  config: SessionConfig;
  onConfigChange: (config: SessionConfig) => void;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  return (
    <div className={s.SessionConfiguration}>
      <div className={s.LeftColumn}>
        <div className={s.Control}>
          <div className={s.ControlLabel}>Start from</div>
          <StartFromInput
            value={props.config.startFrom}
            onChange={(v) => props.onConfigChange({ ...props.config, startFrom: v })}
            topicsInternalStats={props.topicsInternalStats}
          />
        </div>
      </div>
      <div className={s.RightColumn}>
        <div className={s.Filters}>
          <div className={s.ControlLabel}>Filters</div>
          <FilterChain
            topicNode={props.config.topicNode}
            value={props.config.messageFilterChain}
            onChange={(chain) => props.onConfigChange({ ...props.config, messageFilterChain: chain })}
          />
        </div>
      </div>
    </div>
  );
}

export default SessionConfiguration;
