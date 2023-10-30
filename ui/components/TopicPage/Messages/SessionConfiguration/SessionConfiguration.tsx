import React from 'react';

import FilterChainEditor from './FilterChainEditor/FilterChainEditor';
import { GetTopicsInternalStatsResponse } from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';

import s from './SessionConfiguration.module.css'
import FormItem from '../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';
import LibraryBrowserPanel from '../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../app/hooks/use-hover';
import { UserManagedConsumerSessionConfig, UserManagedConsumerSessionSpec, UserManagedConsumerSessionConfigValueOrReference } from '../../../ui/LibraryBrowser/model/user-managed-items';
import { UseUserManagedItemValueSpinner, useUserManagedItemValue } from '../../../ui/LibraryBrowser/useUserManagedItemValue';
import { LibraryContext } from '../../../ui/LibraryBrowser/model/library-context';
import StartFromInput from './StartFromInput/StartFromInput';
import TopicsSelectorInput from './TopicsSelectorsInput/TopicsSelectorsInput';

export type SessionConfigurationProps = {
  value: UserManagedConsumerSessionConfigValueOrReference;
  onChange: (config: UserManagedConsumerSessionConfigValueOrReference) => void;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  libraryContext: LibraryContext;
};

const SessionConfiguration: React.FC<SessionConfigurationProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useUserManagedItemValue<UserManagedConsumerSessionConfig>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseUserManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: UserManagedConsumerSessionSpec) => {
    const newValue: UserManagedConsumerSessionConfigValueOrReference = { ...props.value, value: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: UserManagedConsumerSessionConfigValueOrReference = { type: 'value', value: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.SessionConfiguration}>
      <div className={s.Title} ref={hoverRef}>
        <LibraryBrowserPanel
          itemToSave={item}
          itemType='consumer-session-config'
          onPick={(item) => props.onChange({
            type: 'reference',
            reference: item.metadata.id,
            value: item as UserManagedConsumerSessionConfig
          })}
          onSave={(item) => props.onChange({
            type: 'reference',
            reference: item.metadata.id,
            value: item as UserManagedConsumerSessionConfig
          })}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.reference, onConvertToValue } : undefined}
        />
      </div>

      <div className={s.Content}>
        <div className={s.LeftColumn}>
          <FormItem>
            <TopicsSelectorInput
              value={itemSpec.topicsSelectors}
              onChange={(v) => onSpecChange({ ...itemSpec, topicsSelectors: v })}
              libraryContext={props.libraryContext}
            />
          </FormItem>

          <FormItem>
            <StartFromInput
              value={itemSpec.startFrom}
              onChange={(v) => onSpecChange({ ...itemSpec, startFrom: v })}
              topicsInternalStats={props.topicsInternalStats}
              libraryContext={props.libraryContext}
            />
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
          <FilterChainEditor
            value={itemSpec.messageFilterChain}
            onChange={(v) => onSpecChange({ ...itemSpec, messageFilterChain: v })}
            libraryContext={props.libraryContext}
          />
        </div>
      </div>

    </div>
  );
}

export default SessionConfiguration;
