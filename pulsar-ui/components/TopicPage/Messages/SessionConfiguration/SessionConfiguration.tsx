import React from 'react';
import s from './SessionConfiguration.module.css'
import StartFromInput from './StartFromInput/StartFromInput';
import { SessionConfig } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/topic_pb';

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
    </div>
  );
}

export default SessionConfiguration;
