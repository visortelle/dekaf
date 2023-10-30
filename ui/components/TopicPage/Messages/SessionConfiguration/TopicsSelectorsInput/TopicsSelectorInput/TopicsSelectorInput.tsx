import React from 'react';
import s from './TopicsSelectorInput.module.css'
import { UserManagedTopicsSelector, UserManagedTopicsSelectorSpec, UserManagedTopicsSelectorValueOrReference } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';
import { useHover } from '../../../../../app/hooks/use-hover';
import { UseUserManagedItemValueSpinner, useUserManagedItemValue } from '../../../../../ui/LibraryBrowser/useUserManagedItemValue';
import LibraryBrowserPanel from '../../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Select from '../../../../../ui/Select/Select';
import ListInput from '../../../../../ui/ConfigurationTable/ListInput/ListInput';
import Input from '../../../../../ui/Input/Input';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import * as Either from 'fp-ts/Either';

export type TopicsSelectorsInputProps = {
  value: UserManagedTopicsSelectorValueOrReference;
  onChange: (value: UserManagedTopicsSelectorValueOrReference) => void;
  onDelete?: () => void;
  libraryContext: LibraryContext;
};

const TopicsSelectorsInput: React.FC<TopicsSelectorsInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useUserManagedItemValue<UserManagedTopicsSelector>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseUserManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: UserManagedTopicsSelectorSpec) => {
    const newValue: UserManagedTopicsSelectorValueOrReference = { ...props.value, value: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: UserManagedTopicsSelectorValueOrReference = { type: 'value', value: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.TopicsSelectorsInput} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={item}
        itemType='topics-selector'
        onPick={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as UserManagedTopicsSelector
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as UserManagedTopicsSelector
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.reference, onConvertToValue } : undefined}
      />
      <FormItem>
        <Select<UserManagedTopicsSelectorSpec['topicsSelector']['type']>
          list={[
            { type: 'item', title: 'Current topic', value: 'current-topic' },
            { type: 'item', title: 'By topic names', value: 'by-fqns' },
            { type: 'item', title: 'By regex', value: 'by-regex' },
          ]}
          onChange={(v) => {
            if (v === 'current-topic') {
              onSpecChange({ topicsSelector: { type: 'current-topic' } });
              return;
            } else if (v === 'by-fqns') {
              const currentTopic = props.libraryContext.pulsarResource.type === 'topic' ? props.libraryContext.pulsarResource : undefined;
              const currentTopicFqn: string | undefined = currentTopic === undefined ? undefined : `${currentTopic.topicPersistency}://${currentTopic.tenant}/${currentTopic.namespace}/${currentTopic.topic}`;

              onSpecChange({
                topicsSelector: {
                  type: 'by-fqns',
                  topicFqns: currentTopicFqn === undefined ? [] : [currentTopicFqn],
                  isConvertPartitionedTopicToItsPartitions: false,
                }
              });
              return;
            } else if (v === 'by-regex') {
              onSpecChange({
                topicsSelector: {
                  type: 'by-regex',
                  pattern: '',
                  regexSubscriptionMode: 'all-topics',
                }
              });
              return;
            }
          }}
          value={itemSpec.topicsSelector.type}
        />
      </FormItem>

      {itemSpec.topicsSelector.type === 'by-fqns' && (
        <FormItem>
          <ListInput<string>
            value={itemSpec.topicsSelector.topicFqns}
            onAdd={(v) => {
              if (itemSpec.topicsSelector.type !== 'by-fqns') {
                return;
              }

              onSpecChange({ topicsSelector: { ...itemSpec.topicsSelector, topicFqns: [...itemSpec.topicsSelector.topicFqns, v] } });
            }}
            onRemove={(v) => {
              if (itemSpec.topicsSelector.type !== 'by-fqns') {
                return;
              }

              onSpecChange({ topicsSelector: { ...itemSpec.topicsSelector, topicFqns: itemSpec.topicsSelector.topicFqns.filter((x) => x !== v) } });
            }}
            getId={(v) => v}
            renderItem={(v) => <>{v}</>}
            editor={{
              render: (value, onChange) => <Input value={value} onChange={onChange} placeholder='persistent://tenant/namespace/topic' />,
              initialValue: ''
            }}
            itemName="topic"
            nothingToShowContent="No topics selected."
            validate={v => {
              if (itemSpec.topicsSelector.type !== 'by-fqns') {
                return Either.right(undefined);
              }

              const topicAlreadyInList = itemSpec.topicsSelector.topicFqns.includes(v);
              if (topicAlreadyInList) {
                return Either.left(new Error('The topic is already in the list.'));
              }

              const pulsarTopicFqnRegex = /^(persistent|non-persistent):\/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/;
              return v.match(pulsarTopicFqnRegex) ? Either.right(undefined) : Either.left(new Error('Expected following topic name format: persistent://tenant/namespace/topic'))
            }}
            shouldShowError={v => v !== ''}
          />
        </FormItem>
      )}
    </div>
  );
}

export default TopicsSelectorsInput;
