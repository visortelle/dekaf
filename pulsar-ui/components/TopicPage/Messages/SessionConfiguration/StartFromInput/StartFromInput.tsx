import React, { useEffect, useMemo, useState } from 'react';
import s from './StartFromInput.module.css'
import Select, { List } from '../../../../ui/Select/Select';
import DatetimePicker from '../../../../ui/DatetimePicker/DatetimePicker';
import { StartFrom } from '../../types';
import { QuickDate } from './quick-date';
import Input from '../../../../ui/Input/Input';
import dayjs from 'dayjs';

export type StartFromInputProps = {
  value: StartFrom,
  onChange: (value: StartFrom) => void,
  disabled?: boolean
};

const list: List = [
  {
    type: 'group', title: 'Subscription position', items: [
      { type: 'item', title: 'Latest', value: 'latest' },
      { type: 'item', title: 'Earliest', value: 'earliest' },
    ]
  },
  {
    type: 'group',
    title: 'Custom date',
    items: [
      { type: 'item', title: 'Date', value: 'date' },
      { type: 'item', title: 'Timestamp', value: 'timestamp' },
    ]
  },
  {
    type: 'group',
    title: 'Quick date',
    items: [
      { type: 'item', title: 'Last 5 minutes', value: 'last-5-minutes' },
      { type: 'item', title: 'Last 15 minutes', value: 'last-15-minutes' },
      { type: 'item', title: 'Last 30 minutes', value: 'last-30-minutes' },
      { type: 'item', title: 'Last 1 hour', value: 'last-1-hour' },
      { type: 'item', title: 'Last 3 hours', value: 'last-3-hours' },
      { type: 'item', title: 'Last 6 hours', value: 'last-6-hours' },
      { type: 'item', title: 'Last 12 hours', value: 'last-12-hours' },
      { type: 'item', title: 'Last 24 hours', value: 'last-24-hours' },
      { type: 'item', title: 'Last 2 days', value: 'last-2-days' },
      { type: 'item', title: 'Last 7 days', value: 'last-7-days' },
      { type: 'item', title: 'Last 30 days', value: 'last-30-days' },
      { type: 'item', title: 'Last 90 days', value: 'last-90-days' },
      { type: 'item', title: 'Last 6 months', value: 'last-6-months' },
      { type: 'item', title: 'Last 1 year', value: 'last-1-year' },
      { type: 'item', title: 'Last 2 years', value: 'last-2-years' },
      { type: 'item', title: 'Last 5 years', value: 'last-5-years' },
      { type: 'item', title: 'Yesterday', value: 'yesterday' },
      { type: 'item', title: 'Day before yesterday', value: 'day-before-yesterday' },
      { type: 'item', title: 'This day last week', value: 'this-day-last-week' },
      { type: 'item', title: 'Previous week', value: 'previous-week' },
      { type: 'item', title: 'Previous month', value: 'previous-month' },
    ]
  }
];

type StartFromType = StartFrom['type'] | QuickDate;

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  return (
    <div className={s.StartFromInput}>
      <div className={s.TypeSelect}>
        <Select
          list={list}
          value={props.value.type === 'quickDate' ? props.value.quickDate : props.value.type}
          onChange={(v) => {
            switch (v as StartFromType) {
              case 'earliest': props.onChange({ type: 'earliest' }); return;
              case 'latest': props.onChange({ type: 'latest' }); return;
              case 'date': props.onChange({ type: 'date', date: new Date() }); return;
              case 'timestamp': props.onChange({ type: 'timestamp', date: new Date() }); return;
              default: props.onChange({ type: 'quickDate', quickDate: v as QuickDate }); return;
            }
          }}
          disabled={props.disabled}
        />
      </div>

      {props.value.type === 'date' && (
        <DatetimePicker
          value={props.value.date}
          onChange={(v) => props.onChange({ type: 'date', date: v || new Date() })}
          disabled={props.disabled}
        />
      )}
      {props.value.type === 'timestamp' && (
        <Input
          value={props.value.date.toISOString()}
          placeholder="0 or 1970-01-01T00:00:00.000Z"
          onChange={(s) => {
            if (props.value.type !== 'timestamp') {
              return;
            }

            const v = s.replace(/["'`]/g, '').trim(); // It may be copy-pasted from logs with quotes or spaces
            console.log('s', s);
            console.log('v', v);
            const isUnixTimestamp = /^\d+$/.test(v);
            const isValid = isUnixTimestamp ? true : dayjs(v).isValid();

            props.onChange({ type: 'timestamp', date: isValid ? dayjs(isUnixTimestamp ? Number(v) : v).toDate() : props.value.date })
          }}
        />
      )}
    </div>
  );
}

export default StartFromInput;
