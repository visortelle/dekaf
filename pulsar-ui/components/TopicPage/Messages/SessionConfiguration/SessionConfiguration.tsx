import React from 'react';
import s from './SessionConfiguration.module.css'
import StartFromInput from './StartFromInput/StartFromInput';
import { SessionConfig } from '../types';

export type SessionConfigurationProps = {
  config: SessionConfig,
  onConfigChange: (config: SessionConfig) => void
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  return (
    <div className={s.SessionConfiguration}>
      <div className={s.Control}>
        <StartFromInput
          value={props.config.startFrom}
          onChange={(v) => props.onConfigChange({ ...props.config, startFrom: v })}
        />
      </div>
    </div>
  );
}

export default SessionConfiguration;
