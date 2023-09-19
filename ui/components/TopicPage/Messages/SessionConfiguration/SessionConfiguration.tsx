import React from 'react';

import StartFromInput from './StartFromInput/StartFromInput';
import FilterChain from './MessageFilterInput/FilterChainEditor';
import { ConsumerSessionConfig } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';

import s from './SessionConfiguration.module.css'
import LibraryBrowserButtons from '../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserButtons/LibraryBrowserButtons';
import FormItem from '../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';
import { H3 } from '../../../ui/H/H';
import LibraryBrowserPanel from '../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';

export type SessionConfigurationProps = {
  config: ConsumerSessionConfig;
  onConfigChange: (config: ConsumerSessionConfig) => void;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  return (
    <div className={s.SessionConfiguration}>
      <div className={s.Title}>
        <LibraryBrowserPanel
          itemType='consumer-session-config'
          onPick={(item) => {
            if (item.descriptor.type !== 'consumer-session-config') {
              return;
            }

            props.onConfigChange(item.descriptor.value)
          }}
        />
      </div>

      <div className={s.Content}>
        <div className={s.LeftColumn}>
          <FormItem>
            <FormLabel content="Start from" />
            <StartFromInput
              value={props.config.startFrom}
              onChange={(v) => props.onConfigChange({ ...props.config, startFrom: v })}
              topicsInternalStats={props.topicsInternalStats}
            />
          </FormItem>
        </div>
        <div className={s.RightColumn}>
          <FilterChain
            value={props.config.messageFilterChain}
            onChange={(v) => (props.onConfigChange({ ...props.config, messageFilterChain: v }))}
          />
        </div>
      </div>

    </div>
  );
}

export default SessionConfiguration;
