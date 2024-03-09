import React, { useEffect, useMemo } from 'react';
import s from './TopicSelectorInput.module.css'
import { ManagedTopicSelector, ManagedTopicSelectorSpec, ManagedTopicSelectorValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Select, { List } from '../../../Select/Select';
import ListInput from '../../../ConfigurationTable/ListInput/ListInput';
import Input from '../../../Input/Input';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import * as Either from 'fp-ts/Either';
import { RegexSubscriptionMode } from '../topic-selector';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';
import TopicSelectorInfo from './TopicSelectorInfo/TopicSelectorInfo';
import { topicSelectorFromManagedSpec } from '../../../LibraryBrowser/model/resolved-items-conversions';

export type TopicsSelectorInputProps = {
  value: ManagedTopicSelectorValOrRef,
  onChange: (value: ManagedTopicSelectorValOrRef) => void,
  onDelete?: () => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const TopicsSelectorInput: React.FC<TopicsSelectorInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedTopicSelector>(props.value);

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

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

  const topicSelector = useMemo(
    () => topicSelectorFromManagedSpec(itemSpec, topicFqn),
    [itemSpec, topicFqn]
  );

  const namespaceFqn = (props.libraryContext.pulsarResource.type === 'namespace' || props.libraryContext.pulsarResource.type === 'topic') ?
    `${props.libraryContext.pulsarResource.tenant}/${props.libraryContext.pulsarResource.namespace}` :
    undefined;

  const isNotApplicableInThisContext = props.value.val?.spec.topicSelector.type === 'current-topic' && props.libraryContext.pulsarResource.type !== 'topic';

  return (
    <div className={s.TopicsSelectorsInput} ref={hoverRef}>
      <LibraryBrowserPanel
        value={item}
        itemType='topic-selector'
        onPick={(item) => props.onChange({
          type: 'value',
          val: item as ManagedTopicSelector
        })}
        onSave={(item) => props.onChange({
          type: 'value',
          val: item as ManagedTopicSelector
        })}
        onChange={(item) => {
          props.onChange({
            ...props.value,
            val: item as ManagedTopicSelector
          });
        }}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
        isReadOnly={props.isReadOnly}
        {...props.libraryBrowserPanel}
      />

      <TopicSelectorInfo topicSelector={topicSelector} />

      <FormItem>
        <Select<ManagedTopicSelectorSpec['topicSelector']['type']>
          list={[
            { type: 'item', title: 'Current Topic', value: 'current-topic' },
            { type: 'item', title: 'Specific Topic(s)', value: 'multi-topic-selector' },
            { type: 'item', title: 'Namespaced RegExp', value: 'namespaced-regex-topic-selector' }
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
          isReadOnly={props.isReadOnly}
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
            isReadOnly={props.isReadOnly}
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
              isReadOnly={props.isReadOnly}
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
              isReadOnly={props.isReadOnly}
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
              isReadOnly={props.isReadOnly}
            />
          </FormItem>
        </>
      )}
      {isNotApplicableInThisContext && (
        <span style={{ color: 'var(--accent-color-red)', display: 'block', marginTop: '-4rem' }}>The topic selector is not applicable in this context.</span>
      )}
    </div>
  );
}

export default TopicsSelectorInput;
