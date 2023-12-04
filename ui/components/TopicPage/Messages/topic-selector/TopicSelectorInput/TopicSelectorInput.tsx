import React from 'react';
import s from './TopicSelectorInput.module.css'
import { ManagedTopicSelector, ManagedTopicSelectorSpec, ManagedTopicSelectorValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Select from '../../../../ui/Select/Select';
import ListInput from '../../../../ui/ConfigurationTable/ListInput/ListInput';
import Input from '../../../../ui/Input/Input';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import * as Either from 'fp-ts/Either';
import { RegexSubscriptionMode } from '../topic-selector';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import TopicSelectorInfo from './TopicSelectorInfo/TopicSelectorInfo';
import { topicSelectorFromManagedSpec } from '../../../../ui/LibraryBrowser/model/resolved-items-conversions';

export type TopicsSelectorInputProps = {
  value: ManagedTopicSelectorValOrRef;
  onChange: (value: ManagedTopicSelectorValOrRef) => void;
  onDelete?: () => void;
  libraryContext: LibraryContext;
};

const TopicsSelectorInput: React.FC<TopicsSelectorInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedTopicSelector>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedTopicSelectorSpec) => {
    const newValue: ManagedTopicSelectorValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedTopicSelectorValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  const topicFqn = (props.libraryContext.pulsarResource.type === 'topic') ?
    `${props.libraryContext.pulsarResource.topicPersistency}://${props.libraryContext.pulsarResource.tenant}/${props.libraryContext.pulsarResource.namespace}/${props.libraryContext.pulsarResource.topic}` :
    undefined;


  const namespaceFqn = (props.libraryContext.pulsarResource.type === 'namespace' || props.libraryContext.pulsarResource.type === 'topic') ?
    `${props.libraryContext.pulsarResource.tenant}/${props.libraryContext.pulsarResource.namespace}` :
    undefined;

  return (
    <div className={s.TopicsSelectorsInput} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={item}
        itemType='topic-selector'
        onPick={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedTopicSelector
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedTopicSelector
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
      />

      <TopicSelectorInfo
        topicSelector={topicSelectorFromManagedSpec(itemSpec, topicFqn)}
      />

      <FormItem>
        <Select<ManagedTopicSelectorSpec['topicSelector']['type']>
          list={[
            { type: 'item', title: 'Current Topic', value: 'current-topic' },
            { type: 'item', title: 'Specific Topic(s)', value: 'multi-topic-selector' },
            { type: 'item', title: 'Namespaced RegExp', value: 'namespaced-regex-topic-selector' },
          ]}
          onChange={(v) => {
            if (v === 'current-topic') {
              onSpecChange({ topicSelector: { type: 'current-topic' } });
              return;
            } else if (v === 'multi-topic-selector') {
              onSpecChange({
                topicSelector: {
                  type: 'multi-topic-selector',
                  topicFqns: []
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
            onChange={(v) => {
              if (itemSpec.topicSelector.type !== 'multi-topic-selector') {
                return;
              }

              onSpecChange({ topicSelector: { ...itemSpec.topicSelector, topicFqns: v } })
            }}
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
            renderItem={(v, _, { isDraggingSomeItem }) => (
              <span
                title={v}
                style={{
                  whiteSpace: isDraggingSomeItem ? 'nowrap' : 'unset',
                  wordBreak: isDraggingSomeItem ? 'unset' : 'break-all',
                  overflow: isDraggingSomeItem ? 'hidden' : 'unset',
                  textOverflow: 'ellipsis',
                  scrollbarWidth: 'thin',
                  padding: '4rem 0'
                }}
              >
                {v}
              </span>)}
            editor={{
              render: (value, onChange) => <Input value={value} onChange={onChange} placeholder='persistent://tenant/namespace/topic' />,
              initialValue: ''
            }}
            itemName="Topic"
            isHideNothingToShow
            validate={(v, topicFqns) => {
              if (itemSpec.topicSelector.type !== 'multi-topic-selector') {
                return Either.right(undefined);
              }

              const topicAlreadyInList = topicFqns.includes(v);
              if (topicAlreadyInList) {
                return Either.left(new Error('The topic is already in the list.'));
              }

              const pulsarTopicFqnRegex = /^(persistent|non-persistent):\/\/([\w-]+)\/([\w-]+)\/([\w-]+)$/;

              if (!v.match(pulsarTopicFqnRegex)) {
                return Either.left(new Error('Expecting the following topic name format: persistent://tenant/namespace/topic'))
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
            <Select<RegexSubscriptionMode>
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
            <FormLabel content="Namespace FQN" help={<>Fully Qualified Namespace Name in the following form: <code>tenant/namespace</code></>} />
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
