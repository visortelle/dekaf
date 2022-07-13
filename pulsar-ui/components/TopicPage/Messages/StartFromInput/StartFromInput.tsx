import React, { useCallback, useEffect, useMemo, useState } from 'react';
import s from './StartFromInput.module.css'
import SelectInput, { List } from '../../../ui/ConfigurationTable/SelectInput/SelectInput';
import DatetimePicker from '../../../ui/DatetimePicker/DatetimePicker';

export type StartFrom =
  { type: 'date', date: Date | undefined } |
  { type: 'timestamp', timestamp: number } |
  { type: 'earliest' } |
  { type: 'latest' } |
  { type: 'last-5-minutes' } |
  { type: 'last-15-minutes' } |
  { type: 'last-30-minutes' } |
  { type: 'last-1-hour' } |
  { type: 'last-3-hours' } |
  { type: 'last-6-hours' } |
  { type: 'last-12-hours' } |
  { type: 'last-24-hours' } |
  { type: 'last-2-days' } |
  { type: 'last-7-days' } |
  { type: 'last-30-days' } |
  { type: 'last-90-days' } |
  { type: 'last-6-months' } |
  { type: 'last-1-year' } |
  { type: 'last-2-years' } |
  { type: 'last-5-years' } |
  { type: 'yesterday' } |
  { type: 'day-before-yesterday' } |
  { type: 'this-day-last-week' } |
  { type: 'previous-week' } |
  { type: 'previous-month' };

export type StartFromType = StartFrom['type'];

export type StartFromInputProps = {
  value: StartFrom,
  onChange: (value: StartFrom) => void,
  disabled?: boolean
};

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  const [startFromType, setStartFromType] = useState<StartFromType>(props.value.type);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);

  useEffect(() => setFromDate(new Date()), []); // Initial from date value

  const list = useMemo<List<StartFromType>>(() => [
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
    },

  ], []);

  return (
    <div className={s.StartFromInput}>
      <div className={s.TypeSelect}>
        <SelectInput<StartFromType>
          list={list}
          value={startFromType}
          onChange={(v) => {
            setStartFromType(() => v);
            switch (v) {
              case 'earliest': props.onChange({ type: 'earliest' }); break;
              case 'latest': props.onChange({ type: 'latest' }); break;
            }
          }}
          disabled={props.disabled}
        />
      </div>

      {startFromType === 'date' && <DatetimePicker value={fromDate} onChange={(v) => setFromDate(v)} disabled={props.disabled} />}
    </div>
  );
}

export default StartFromInput;
