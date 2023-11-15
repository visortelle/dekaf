import React from 'react';
import s from './TopicsSelectorInput.module.css'
import { ManagedTopicsSelector, ManagedTopicsSelectorSpec, ManagedTopicsSelectorValOrRef } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';
import { useHover } from '../../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../../ui/LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel from '../../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Select from '../../../../../ui/Select/Select';
import ListInput from '../../../../../ui/ConfigurationTable/ListInput/ListInput';
import Input from '../../../../../ui/Input/Input';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import * as Either from 'fp-ts/Either';
import { RegexSubMode } from '../../../types';

export type TopicsSelectorInputProps = {
  value: ManagedTopicsSelectorValOrRef;
  onChange: (value: ManagedTopicsSelectorValOrRef) => void;
  onDelete?: () => void;
  libraryContext: LibraryContext;
};

const TopicsSelectorInput: React.FC<TopicsSelectorInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedTopicsSelector>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedTopicsSelectorSpec) => {
    const newValue: ManagedTopicsSelectorValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedTopicsSelectorValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.TopicsSelectorsInput} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={item}
        itemType='topic-selector'
        onPick={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedTopicsSelector
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedTopicsSelector
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
      />

      <FormItem>
        <Select<ManagedTopicsSelectorSpec['topicsSelector']['type']>
          list={[
            { type: 'item', title: 'Current topic', value: 'current-topic' },
            { type: 'item', title: 'By topic names', value: 'by-fqns' },
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
            } else if (v === 'namespaced-regex-topic-selector') {
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
            validate={(v, topicFqns) => {
              if (itemSpec.topicsSelector.type !== 'by-fqns') {
                return Either.right(undefined);
              }

              const topicAlreadyInList = topicFqns.includes(v);
              if (topicAlreadyInList) {
                return Either.left(new Error('The topic is already in the list.'));
              }

              const pulsarTopicFqnRegex = /^(persistent|non-persistent):\/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/;

              if (!v.match(pulsarTopicFqnRegex)) {
                return Either.left(new Error('Expected following topic name format: persistent://tenant/namespace/topic'))
              }

              const isMixesTopicsAndItsPartitions = topicFqns.concat([v]).some((topicFqn) => {
                return topicFqns.some((maybePartition) => {
                  return maybePartition.startsWith(`${topicFqn}-partition-`) && /\d+$/.test(maybePartition);
                });
              });

              if (isMixesTopicsAndItsPartitions) {
                return Either.left(new Error('You can\'t mix topics and its partitions.'));
              }

              return Either.right(undefined);
            }}
            shouldShowError={v => v !== ''}
          />
        </FormItem>
      )}

      {itemSpec.topicsSelector.type === 'by-regex' && (
        <>
          <FormItem>
            <Select<RegexSubMode>
              list={[
                { type: 'item', title: 'All topics', value: 'all-topics' },
                { type: 'item', title: 'Persistent topics', value: 'persistent-only' },
                { type: 'item', title: 'Non-Persistent topics', value: 'non-persistent-only' }
              ]}
              value={itemSpec.topicsSelector.regexSubscriptionMode}
              onChange={(v) => {
                if (itemSpec.topicsSelector.type !== 'by-regex') {
                  return;
                }

                onSpecChange({ topicsSelector: { ...itemSpec.topicsSelector, regexSubscriptionMode: v } });
              }}
            />
          </FormItem>

          <FormItem>
            <Input
              value={itemSpec.topicsSelector.pattern}
              onChange={(v) => {
                if (itemSpec.topicsSelector.type !== 'by-regex') {
                  return;
                }

                onSpecChange({ topicsSelector: { ...itemSpec.topicsSelector, pattern: v } });
              }}
              placeholder='.*'
            />
          </FormItem>
        </>
      )}
    </div>
  );
}

export default TopicsSelectorInput;
