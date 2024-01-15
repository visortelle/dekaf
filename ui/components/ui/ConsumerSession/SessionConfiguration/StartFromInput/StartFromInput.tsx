import React from 'react';
import s from './StartFromInput.module.css'
import Select, { List } from '../../../Select/Select';
import DatetimePicker from '../../../DatetimePicker/DatetimePicker';
import { ConsumerSessionStartFrom } from '../../types';
import Input from '../../../Input/Input';
import RelativeDateTimePicker from '../../../RelativeDateTimePicker/RelativeDateTimePicker';
import { v4 as uuid } from 'uuid';
import { useHover } from '../../../../app/hooks/use-hover';
import { ManagedConsumerSessionStartFrom, ManagedConsumerSessionStartFromSpec, ManagedConsumerSessionStartFromValOrRef, ManagedDateTimeValOrRef, ManagedMessageIdValOrRef, ManagedRelativeDateTimeValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import { cloneDeep } from 'lodash';

export type StartFromInputProps = {
  value: ManagedConsumerSessionStartFromValOrRef;
  onChange: (value: ManagedConsumerSessionStartFromValOrRef) => void;
  libraryContext: LibraryContext;
  disabled?: boolean;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

type StartFromType = ConsumerSessionStartFrom['type'];

const list: List<StartFromType> = [
  { type: 'item', title: 'Earliest message', value: 'earliestMessage' },
  { type: 'item', title: 'Latest message', value: 'latestMessage' },
  {
    type: 'item',
    title: 'Message with specific ID',
    value: 'messageId'
  },
  { type: 'item', title: 'Specific time', value: 'dateTime' },
  { type: 'item', title: 'Relative time ago', value: 'relativeDateTime' },
  { type: 'item', title: 'Skip fist n messages', value: 'nthMessageAfterEarliest' },
  { type: 'item', title: 'Latest n messages', value: 'nthMessageBeforeLatest' }
];

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedConsumerSessionStartFrom>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedConsumerSessionStartFromSpec) => {
    const newValue: ManagedConsumerSessionStartFromValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedConsumerSessionStartFromValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  const worksBestWithNonPartitionedTopic = <div style={{ padding: '12rem', borderRadius: '8rem', marginTop: '8rem', background: 'var(--surface-color)' }}>Works best with a single non-partitioned topic.</div>;

  return (
    <div className={s.StartFromInput} ref={hoverRef}>
      <LibraryBrowserPanel
        value={item}
        itemType='consumer-session-start-from'
        onPick={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedConsumerSessionStartFrom
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedConsumerSessionStartFrom
        })}
        onChange={(item) => {
          props.onChange({
            ...props.value,
            val: item as ManagedConsumerSessionStartFrom
          });
        }}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
        isReadOnly={props.isReadOnly}
        {...props.libraryBrowserPanel}
      />
      <div className={s.TypeSelect}>
        <Select<ManagedConsumerSessionStartFromSpec['startFrom']['type']>
          list={list}
          value={itemSpec.startFrom.type}
          onChange={(v) => {
            switch (v as StartFromType) {
              case 'earliestMessage': {
                onSpecChange({ startFrom: { type: 'earliestMessage' } });
                return;
              }
              case 'latestMessage': {
                onSpecChange({ startFrom: { type: 'latestMessage' } });
                return;
              }
              case 'nthMessageAfterEarliest': {
                onSpecChange({ startFrom: { type: 'nthMessageAfterEarliest', n: 5 } });
                return;
              }
              case 'nthMessageBeforeLatest': {
                onSpecChange({ startFrom: { type: 'nthMessageBeforeLatest', n: 5 } });
                return;
              }
              case 'messageId': {
                const messageId: ManagedMessageIdValOrRef = {
                  type: 'value',
                  val: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'message-id' },
                    spec: { hexString: '' }
                  }
                }
                onSpecChange({ startFrom: { type: 'messageId', messageId } });
                return;
              };
              case 'dateTime': {
                const dateTime: ManagedDateTimeValOrRef = {
                  type: 'value',
                  val: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'date-time' },
                    spec: { dateTime: new Date() }
                  }
                };
                onSpecChange({ startFrom: { type: 'dateTime', dateTime } });
                return;
              }
              case 'relativeDateTime': {
                const relativeDateTime: ManagedRelativeDateTimeValOrRef = {
                  type: 'value',
                  val: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'relative-date-time' },
                    spec: {
                      unit: 'hour',
                      value: 1,
                      isRoundedToUnitStart: false
                    }
                  }
                };
                onSpecChange({ startFrom: { type: 'relativeDateTime', relativeDateTime } });
                return;
              }
            }
          }}
          disabled={props.disabled}
          isReadOnly={props.isReadOnly}
        />
      </div>
      {itemSpec.startFrom.type === 'nthMessageAfterEarliest' && (
        <div className={s.AdditionalControls}>
          <Input
            value={itemSpec.startFrom.n.toString()}
            type='number'
            onChange={(v) => onSpecChange({ startFrom: { type: 'nthMessageAfterEarliest', n: parseInt(v) } })}
            inputProps={{ disabled: props.disabled, min: 0 }}
            placeholder='n'
            isReadOnly={props.isReadOnly}
          />
          {worksBestWithNonPartitionedTopic}
        </div>
      )}
      {itemSpec.startFrom.type === 'nthMessageBeforeLatest' && (
        <div className={s.AdditionalControls}>
          <Input
            value={itemSpec.startFrom.n.toString()}
            type='number'
            onChange={(v) => onSpecChange({ startFrom: { type: 'nthMessageBeforeLatest', n: parseInt(v) } })}
            inputProps={{ disabled: props.disabled, min: 0 }}
            placeholder='n'
            isReadOnly={props.isReadOnly}
          />
          {worksBestWithNonPartitionedTopic}
        </div>
      )}
      {itemSpec.startFrom.type === 'messageId' && (
        <div className={s.AdditionalControls}>
          <Input
            value={itemSpec.startFrom.messageId.val?.spec.hexString || ''}
            placeholder="08 c3 03 10 cd 04 20 00 30 01"
            onChange={(v) => {
              const newItemSpec = cloneDeep(itemSpec);

              if (newItemSpec.startFrom.type !== 'messageId') {
                return;
              }

              if (newItemSpec.startFrom.messageId.val === undefined) {
                return;
              }

              newItemSpec.startFrom.messageId.val.spec.hexString = v;
              onSpecChange(newItemSpec);
            }}
            isReadOnly={props.isReadOnly}
          />
          {worksBestWithNonPartitionedTopic}
        </div>
      )}
      {itemSpec.startFrom.type === 'dateTime' && (
        <div className={s.AdditionalControls}>
          <DatetimePicker
            value={itemSpec.startFrom.dateTime.val?.spec.dateTime}
            onChange={(v) => {
              const newItemSpec = cloneDeep(itemSpec);

              if (newItemSpec.startFrom.type !== 'dateTime') {
                return;
              }

              if (newItemSpec.startFrom.dateTime.val === undefined) {
                return;
              }

              newItemSpec.startFrom.dateTime.val.spec.dateTime = v || new Date();
              onSpecChange(newItemSpec);
            }}
            disabled={props.disabled}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
      {itemSpec.startFrom.type === 'relativeDateTime' && (
        <div className={s.AdditionalControls}>
          <RelativeDateTimePicker
            value={itemSpec.startFrom.relativeDateTime.val?.spec!}
            onChange={(v) => {
              const newItemSpec = cloneDeep(itemSpec);

              if (newItemSpec.startFrom.type !== 'relativeDateTime') {
                return;
              }

              if (newItemSpec.startFrom.relativeDateTime.val === undefined) {
                return;
              }

              newItemSpec.startFrom.relativeDateTime.val.spec = v;
              onSpecChange(newItemSpec);
            }}
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
    </div >
  );
}

export default StartFromInput;
