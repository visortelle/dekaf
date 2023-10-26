import React from 'react';
import s from './StartFromInput.module.css'
import Select, { List } from '../../../../ui/Select/Select';
import DatetimePicker from '../../../../ui/DatetimePicker/DatetimePicker';
import { StartFrom } from '../../types';
import Input from '../../../../ui/Input/Input';
import { GetTopicsInternalStatsResponse } from '../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import RelativeDateTimePicker from '../../../../ui/RelativeDateTimePicker/RelativeDateTimePicker';
import { v4 as uuid } from 'uuid';
import { useHover } from '../../../../app/hooks/use-hover';
import { UserManagedConsumerSessionStartFrom, UserManagedConsumerSessionStartFromSpec, UserManagedConsumerSessionStartFromValueOrReference, UserManagedDateTimeValueOrReference, UserManagedMessageIdValueOrReference, UserManagedRelativeDateTimeValueOrReference } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { UseUserManagedItemValueSpinner, useUserManagedItemValue } from '../../../../ui/LibraryBrowser/useUserManagedItemValue';
import dayjs from 'dayjs';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';

export type StartFromInputProps = {
  value: UserManagedConsumerSessionStartFromValueOrReference;
  onChange: (value: UserManagedConsumerSessionStartFromValueOrReference) => void;
  libraryContext: LibraryContext;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
  disabled?: boolean;
};

type StartFromType = StartFrom['type'];

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
];

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  const isHasPartitionedTopic = hasPartitionedTopic(props.topicsInternalStats);
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useUserManagedItemValue<UserManagedConsumerSessionStartFrom>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseUserManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: UserManagedConsumerSessionStartFromSpec) => {
    const newValue: UserManagedConsumerSessionStartFromValueOrReference = { ...props.value, value: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: UserManagedConsumerSessionStartFromValueOrReference = { type: 'value', value: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.StartFromInput} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={item}
        itemType='consumer-session-start-from'
        onPick={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as UserManagedConsumerSessionStartFrom
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as UserManagedConsumerSessionStartFrom
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.reference, onConvertToValue } : undefined}
      />
      <div className={s.TypeSelect}>
        <Select<UserManagedConsumerSessionStartFromSpec['startFrom']['type']>
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
              case 'messageId': {
                const messageId: UserManagedMessageIdValueOrReference = {
                  type: 'value',
                  value: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'message-id' },
                    spec: { messageId: new Uint8Array() }
                  }
                }
                onSpecChange({ startFrom: { type: 'messageId', messageId } });
                return;
              };
              case 'dateTime': {
                const dateTime: UserManagedDateTimeValueOrReference = {
                  type: 'value',
                  value: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'date-time' },
                    spec: { dateTime: dayjs(new Date()).subtract(1, 'day').toDate() }
                  }
                };
                onSpecChange({ startFrom: { type: 'dateTime', dateTime } });
                return;
              }
              case 'relativeDateTime': {
                const relativeDateTime: UserManagedRelativeDateTimeValueOrReference = {
                  type: 'value',
                  value: {
                    metadata: { id: uuid(), name: '', descriptionMarkdown: '', type: 'relative-date-time' },
                    spec: {
                      unit: 'hour',
                      value: 24,
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
        {/* {props.value.spec.startFrom.type === 'messageId' && (
          isHasPartitionedTopic ? (
            <div style={{ color: 'var(--accent-color-red)', marginTop: '2rem' }}>
              <strong>Can be only applied on non-partitioned topics or individual partitions.</strong>
            </div>
          ) : (
            <Input
              value={props.value.spec.startFrom.messageId}
              placeholder="08 c3 03 10 cd 04 20 00 30 01"
              onChange={(v) => props.onChange({ type: 'messageId', hexString: v })}
            />
          )
        )}
        {props.value.spec.startFrom.type === 'dateTime' && (
          <DatetimePicker
            value={props.value.spec.startFrom.dateTime}
            onChange={(v) => props.onChange({ type: 'dateTime', dateTime: v || new Date() })}
            disabled={props.disabled}
          />
        )}
        {props.value.type === 'relativeDateTime' && (
          <RelativeDateTimePicker
            value={props.value.value}
            onChange={(v) => props.onChange({ type: 'relativeDateTime', value: v })}
          />
        )} */}
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
