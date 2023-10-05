import React from 'react';

import FilterChain from './FilterChainEditor/FilterChainEditor';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';

import s from './SessionConfiguration.module.css'
import FormItem from '../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';
import LibraryBrowserPanel from '../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../app/hooks/use-hover';
import { UserManagedConsumerSessionConfig, UserManagedConsumerSessionConfigSpec, UserManagedConsumerSessionConfigValueOrReference } from '../../../ui/LibraryBrowser/model/user-managed-items';
import { UseUserManagedItemValOrRefSpinner, useResolveUserManagedItemValOrRef } from '../../../ui/LibraryBrowser/useResolveUserManagedItemValOrRef';
import { LibraryContext } from '../../../ui/LibraryBrowser/model/library-context';

export type SessionConfigurationProps = {
  value: UserManagedConsumerSessionConfigValueOrReference;
  onChange: (config: UserManagedConsumerSessionConfigValueOrReference) => void;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  libraryContext: LibraryContext;
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const resolveResult = useResolveUserManagedItemValOrRef<UserManagedConsumerSessionConfig>(props.value);

  if (resolveResult.type !== 'success') {
    return <UseUserManagedItemValOrRefSpinner item={props.value} result={resolveResult} />
  }

  const value = resolveResult.value;
  const spec = value.spec;

  const onSpecChange = (spec: UserManagedConsumerSessionConfigSpec) => {
    if (props.value.type === 'value') {
      const newValue: UserManagedConsumerSessionConfigValueOrReference = { ...props.value, value: { ...props.value.value, spec } };
      props.onChange(newValue);
      return;
    }

    if (props.value.type === 'reference' && props.value.localValue !== undefined) {
      const newValue: UserManagedConsumerSessionConfigValueOrReference = { ...props.value, localValue: { ...props.value.localValue, spec } };
      props.onChange(newValue);
      return;
    }
  };

  return (
    <div className={s.SessionConfiguration}>
      <div className={s.Title} ref={hoverRef}>
        <LibraryBrowserPanel
          itemToSave={value}
          itemType='consumer-session-config'
          onPick={(item) => {
            if (item.metadata.type !== 'message-filter-chain') {
              return;
            }

            props.onChange({ type: 'reference', reference: item.metadata.id })
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
        />
      </div>

      <div className={s.Content}>
        <div className={s.LeftColumn}>
          <FormItem>
            <FormLabel content="Start From" />
            {/* <StartFromInput
              value={props.value.startFrom}
              onChange={(v) => props.onChange({ ...props.value, startFrom: v })}
              topicsInternalStats={props.topicsInternalStats}
            /> */}
          </FormItem>

          <FormItem>
            <FormLabel
              content="Pause Trigger"
              help={(
                <div>
                  The consumer will automatically pause when the specified condition is met.
                  It useful when you want to find some specific messages in large topics.
                </div>
              )}
            />
            <div>TODO</div>
          </FormItem>
        </div>
        <div className={s.RightColumn}>
          <FilterChain
            value={spec.messageFilterChain}
            onChange={(v) => onSpecChange({ ...spec, messageFilterChain: v })}
            libraryContext={props.libraryContext}
          />
        </div>
      </div>

    </div>
  );
}

export default SessionConfiguration;
