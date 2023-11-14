import React from 'react';
import s from './StartFromInput.module.css'
import Select, { List } from '../../../../ui/Select/Select';
import DatetimePicker from '../../../../ui/DatetimePicker/DatetimePicker';
import { ConsumerSessionStartFrom } from '../../types';
import Input from '../../../../ui/Input/Input';
import { GetTopicsInternalStatsResponse } from '../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import RelativeDateTimePicker from '../../../../ui/RelativeDateTimePicker/RelativeDateTimePicker';
import { v4 as uuid } from 'uuid';
import { useHover } from '../../../../app/hooks/use-hover';
import { ManagedConsumerSessionStartFrom, ManagedConsumerSessionStartFromSpec, ManagedConsumerSessionStartFromValOrRef, ManagedDateTimeValOrRef, ManagedMessageIdValOrRef, ManagedRelativeDateTimeValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import dayjs from 'dayjs';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import { clone } from 'lodash';

export type StartFromInputProps = {
  value: ManagedConsumerSessionStartFromValOrRef;
  onChange: (value: ManagedConsumerSessionStartFromValOrRef) => void;
  libraryContext: LibraryContext;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  disabled?: boolean;
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
  { type: 'item', title: 'n-th message after Earliest message', value: 'nthMessageAfterEarliest' },
  { type: 'item', title: 'n-th message before Latest message', value: 'nthMessageBeforeLatest' }
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
    const newValue: ManagedConsumerSessionStartFromValOrRef = { ...props.value, value: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedConsumerSessionStartFromValOrRef = { type: 'value', value: item };
    props.onChange(newValue);
  };

  const worksBestWithNonPartitionedTopic = <div style={{ padding: '12rem', borderRadius: '8rem', marginTop: '8rem', background: 'var(--surface-color)' }}>Works best with a single non-partitioned topic.</div>;

  return (
    <div className={s.StartFromInput} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={item}
        itemType='consumer-session-start-from'
        onPick={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as ManagedConsumerSessionStartFrom
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as ManagedConsumerSessionStartFrom
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.reference, onConvertToValue } : undefined}
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
                  value: {
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
                  value: {
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
                  value: {
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
        />
      </div>
      <div className={s.AdditionalControls}>
        {itemSpec.startFrom.type === 'nthMessageAfterEarliest' && (
          <>
            <Input
              value={itemSpec.startFrom.n.toString()}
              type='number'
              onChange={(v) => onSpecChange({ startFrom: { type: 'nthMessageAfterEarliest', n: parseInt(v) } })}
              inputProps={{ disabled: props.disabled, min: 0 }}
              placeholder='n'
            />
            {worksBestWithNonPartitionedTopic}
          </>
        )}
        {itemSpec.startFrom.type === 'nthMessageBeforeLatest' && (
          <>
            <Input
              value={itemSpec.startFrom.n.toString()}
              type='number'
              onChange={(v) => onSpecChange({ startFrom: { type: 'nthMessageBeforeLatest', n: parseInt(v) } })}
              inputProps={{ disabled: props.disabled, min: 0 }}
              placeholder='n'
            />
            {worksBestWithNonPartitionedTopic}
          </>
        )}
        {itemSpec.startFrom.type === 'messageId' && (
          <>
            <Input
              value={itemSpec.startFrom.messageId.value?.spec.hexString || ''}
              placeholder="08 c3 03 10 cd 04 20 00 30 01"
              onChange={(v) => {
                const newItemSpec = clone(itemSpec);

                if (newItemSpec.startFrom.type !== 'messageId') {
                  return;
                }

                if (newItemSpec.startFrom.messageId.value === undefined) {
                  return;
                }

                newItemSpec.startFrom.messageId.value.spec.hexString = v;
                onSpecChange(newItemSpec);
              }}
            />
            {worksBestWithNonPartitionedTopic}
          </>
        )}
        {itemSpec.startFrom.type === 'dateTime' && (
          <DatetimePicker
            value={itemSpec.startFrom.dateTime.value?.spec.dateTime}
            onChange={(v) => {
              const newItemSpec = clone(itemSpec);

              if (newItemSpec.startFrom.type !== 'dateTime') {
                return;
              }

              if (newItemSpec.startFrom.dateTime.value === undefined) {
                return;
              }

              newItemSpec.startFrom.dateTime.value.spec.dateTime = v || new Date();
              onSpecChange(newItemSpec);
            }}
            disabled={props.disabled}
          />
        )}
        {itemSpec.startFrom.type === 'relativeDateTime' && (
          <RelativeDateTimePicker
            value={itemSpec.startFrom.relativeDateTime.value?.spec!}
            onChange={(v) => {
              const newItemSpec = clone(itemSpec);

              if (newItemSpec.startFrom.type !== 'relativeDateTime') {
                return;
              }

              if (newItemSpec.startFrom.relativeDateTime.value === undefined) {
                return;
              }

              newItemSpec.startFrom.relativeDateTime.value.spec = v;
              onSpecChange(newItemSpec);
            }}
          />
        )}
      </div>
    </div >
  );
}

function hasPartitionedTopic(topicsInternalStats: GetTopicsInternalStatsResponse | undefined): boolean {
  if (topicsInternalStats === undefined) {
    return false;
  }

  let result = false;
  topicsInternalStats.getStatsMap().forEach((stats) => {
    if (stats.getPartitionedTopicStats() !== undefined) {
      result = true;
    }
  });
  return result;
}

export default StartFromInput;
