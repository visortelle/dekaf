import React from 'react';
import s from './StartFromInput.module.css'
import Select, { List } from '../../../../ui/Select/Select';
import DatetimePicker from '../../../../ui/DatetimePicker/DatetimePicker';
import { StartFrom } from '../../types';
import Input from '../../../../ui/Input/Input';
import { GetTopicsInternalStatsResponse } from '../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import RelativeDateTimePicker from '../../../../ui/RelativeDateTimePicker/RelativeDateTimePicker';

export type StartFromInputProps = {
  value: StartFrom;
  onChange: (value: StartFrom) => void;
  disabled?: boolean;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
};

type StartFromType = StartFrom['type'];

const list: List<StartFromType> = [
  { type: 'item', title: 'Latest message', value: 'latestMessage' },
  { type: 'item', title: 'Earliest message', value: 'earliestMessage' },
  {
    type: 'item',
    title: 'Message with specific ID',
    value: 'messageId'
  },
  { type: 'item', title: 'Date and time', value: 'dateTime' },
  { type: 'item', title: 'Relative date and time', value: 'relativeDateTime' },
];

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  const isHasPartitionedTopic = hasPartitionedTopic(props.topicsInternalStats);

  return (
    <div className={s.StartFromInput}>
      <div className={s.TypeSelect}>
        <Select
          list={list}
          value={props.value.type}
          onChange={(v) => {
            switch (v as StartFromType) {
              case 'earliestMessage': props.onChange({ type: 'earliestMessage' }); return;
              case 'latestMessage': props.onChange({ type: 'latestMessage' }); return;
              case 'messageId': props.onChange({ type: 'messageId', hexString: "" }); return;
              case 'dateTime': props.onChange({ type: 'dateTime', dateTime: new Date() }); return;
              case 'relativeDateTime': props.onChange({
                type: 'relativeDateTime',
                value: {
                  unit: 'hour',
                  value: 24,
                  isRoundToUnitStart: false
                }
              }); return;
            }
          }}
          disabled={props.disabled}
        />
      </div>
      <div className={s.AdditionalControls}>
        {props.value.type === 'messageId' && (
          isHasPartitionedTopic ? (
            <div style={{ color: 'var(--accent-color-red)', marginTop: '2rem' }}>
              <strong>Can be only applied on non-partitioned topics or individual partitions.</strong>
            </div>
          ) : (
            <Input
              value={props.value.hexString}
              placeholder="08 c3 03 10 cd 04 20 00 30 01"
              onChange={(v) => props.onChange({ type: 'messageId', hexString: v })}
            />
          )
        )}
        {props.value.type === 'dateTime' && (
          <DatetimePicker
            value={props.value.dateTime}
            onChange={(v) => props.onChange({ type: 'dateTime', dateTime: v || new Date() })}
            disabled={props.disabled}
          />
        )}
        {props.value.type === 'relativeDateTime' && (
          <RelativeDateTimePicker
            value={props.value.value}
            onChange={(v) => props.onChange({ type: 'relativeDateTime', value: v })}
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
