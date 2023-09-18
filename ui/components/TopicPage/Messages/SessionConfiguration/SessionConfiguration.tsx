import React from 'react';

import StartFromInput from './StartFromInput/StartFromInput';
import FilterChain from './MessageFilterInput/FilterChainEditor';
import { ConsumerSessionConfig } from '../types';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';

import s from './SessionConfiguration.module.css'
import LibraryBrowserButtons from '../../../ui/LibraryBrowser/LibraryBrowserButtons/LibraryBrowserButtons';
import FormItem from '../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';
import { H3 } from '../../../ui/H/H';

export type SessionConfigurationProps = {
  config: ConsumerSessionConfig;
  onConfigChange: (config: ConsumerSessionConfig) => void;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  return (
    <div className={s.SessionConfiguration}>
      <div className={s.Title}>
        <H3>Consumer Session Config</H3>
        <LibraryBrowserButtons />
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
          <div>
            <FormItem>
              <div style={{ display: 'flex', gap: '12rem', alignItems: 'flex-end' }}>
                <FormLabel
                  content='Filter Chain'
                  help={(
                    <div>
                      Filter chain is a list of filters that are sequentially applied to each message.
                    </div>
                  )}
                />
                <LibraryBrowserButtons

                />
              </div>

            </FormItem>


            <FilterChain
              value={props.config.messageFilterChain}
              onChange={(v) => (props.onConfigChange({ ...props.config, messageFilterChain: v }))}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

export default SessionConfiguration;
