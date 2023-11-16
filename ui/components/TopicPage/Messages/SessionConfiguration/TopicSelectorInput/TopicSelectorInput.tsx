import React from 'react';
import s from './TopicSelectorInput.module.css'
import { ManagedTopicsSelector, ManagedTopicSelectorSpec, ManagedTopicsSelectorValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Select from '../../../../ui/Select/Select';
import ListInput from '../../../../ui/ConfigurationTable/ListInput/ListInput';
import Input from '../../../../ui/Input/Input';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import * as Either from 'fp-ts/Either';
import { RegexSubMode } from '../../types';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';

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

  const onSpecChange = (spec: ManagedTopicSelectorSpec) => {
    const newValue: ManagedTopicsSelectorValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedTopicsSelectorValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };


  const namespaceFqn = (props.libraryContext.pulsarResource.type === 'namespace' || props.libraryContext.pulsarResource.type === 'topic') ?
    props.libraryContext.pulsarResource.namespace :
    undefined;

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
        <Select<ManagedTopicSelectorSpec['topicSelector']['type']>
          list={[
            { type: 'item', title: 'Current Topic', value: 'current-topic' },
            { type: 'item', title: 'Single Topic', value: 'multi-topic-selector' },
            { type: 'item', title: 'Namespaced RegExp', value: 'namespaced-regex-topic-selector' },
          ]}
          onChange={(v) => {
            if (v === 'current-topic') {
              onSpecChange({ topicSelector: { type: 'current-topic' } });
              return;
            } else if (v === 'multi-topic-selector') {
              const currentTopic = props.libraryContext.pulsarResource.type === 'topic' ? props.libraryContext.pulsarResource : undefined;
              const currentTopicFqn: string | undefined = currentTopic === undefined ? undefined : `${currentTopic.topicPersistency}://${currentTopic.tenant}/${currentTopic.namespace}/${currentTopic.topic}`;

              onSpecChange({
                topicSelector: {
                  type: 'multi-topic-selector',
                  topicFqns: currentTopicFqn === undefined ? [] : [currentTopicFqn],
                }
              });
              return;
            } else if (v === 'namespaced-regex-topic-selector') {
              onSpecChange({
                topicSelector: {
                  type: 'namespaced-regex-topic-selector',
                  namespaceFqn: namespaceFqn || '',
                  pattern: '.*',
                  regexSubscriptionMode: 'all-topics'
                }
              });
              return;
            }
          }}
          value={itemSpec.topicSelector.type}
        />
      </FormItem>

      {itemSpec.topicSelector.type === 'multi-topic-selector' && (
        <FormItem>
          <ListInput<string>
            value={itemSpec.topicSelector.topicFqns}
            onAdd={(v) => {
              if (itemSpec.topicSelector.type !== 'multi-topic-selector') {
                return;
              }

              onSpecChange({ topicSelector: { ...itemSpec.topicSelector, topicFqns: [...itemSpec.topicSelector.topicFqns, v] } });
            }}
            onRemove={(v) => {
              if (itemSpec.topicSelector.type !== 'multi-topic-selector') {
                return;
              }

              onSpecChange({ topicSelector: { ...itemSpec.topicSelector, topicFqns: itemSpec.topicSelector.topicFqns.filter((x) => x !== v) } });
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
              if (itemSpec.topicSelector.type !== 'multi-topic-selector') {
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

      {itemSpec.topicSelector.type === 'namespaced-regex-topic-selector' && (
        <>
          <FormItem>
            <Select<RegexSubMode>
              list={[
                { type: 'item', title: 'All topics', value: 'all-topics' },
                { type: 'item', title: 'Persistent topics', value: 'persistent-only' },
                { type: 'item', title: 'Non-Persistent topics', value: 'non-persistent-only' }
              ]}
              value={itemSpec.topicSelector.regexSubscriptionMode}
              onChange={(v) => {
                if (itemSpec.topicSelector.type !== 'namespaced-regex-topic-selector') {
                  return;
                }

                onSpecChange({ topicSelector: { ...itemSpec.topicSelector, regexSubscriptionMode: v } });
              }}
            />
          </FormItem>

          <FormItem>
            <FormLabel content="Namespace" />
            <Input
              value={itemSpec.topicSelector.namespaceFqn}
              onChange={(v) => {
                if (itemSpec.topicSelector.type !== 'namespaced-regex-topic-selector') {
                  return;
                }

                onSpecChange({ topicSelector: { ...itemSpec.topicSelector, namespaceFqn: v } });
              }}
              placeholder='tenant/namespace'
            />
          </FormItem>

          <FormItem>
            <FormLabel content="Pattern" />
            <Input
              value={itemSpec.topicSelector.pattern}
              onChange={(v) => {
                if (itemSpec.topicSelector.type !== 'namespaced-regex-topic-selector') {
                  return;
                }

                onSpecChange({ topicSelector: { ...itemSpec.topicSelector, pattern: v } });
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
