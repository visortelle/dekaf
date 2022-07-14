import React, { useEffect } from 'react';
import s from './StartFromInput.module.css'
import Select, { List } from '../../../../ui/Select/Select';
import DatetimePicker from '../../../../ui/DatetimePicker/DatetimePicker';
import { StartFrom } from '../../types';
import { QuickDate, quickDateToDate } from './quick-date';
import Input from '../../../../ui/Input/Input';
import dayjs from 'dayjs';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import { timestampToDate } from './timestamp-to-date';

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
  const [latestSelectedDate, setLatestSelectedDate] = React.useState<Date>(new Date());

  useEffect(() => {
    switch (props.value.type) {
      case 'date': setLatestSelectedDate(props.value.date); break;
      case 'timestamp': setLatestSelectedDate(timestampToDate(props.value.ts) || latestSelectedDate); break;
      case 'quickDate': setLatestSelectedDate(quickDateToDate(props.value.quickDate, latestSelectedDate)); break;
    }
  }, [props.value]);

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
              case 'date': props.onChange({ type: 'date', date: latestSelectedDate }); return;
              case 'timestamp': props.onChange({ type: 'timestamp', ts: new Date().getTime().toString() }); return;
              default: {
                const relativeTo = new Date();
                setLatestSelectedDate(relativeTo);
                props.onChange({ type: 'quickDate', quickDate: v as QuickDate, relativeTo });
              }; return;
            }
          }}
          disabled={props.disabled}
        />
      </div>

      <div className={s.AdditionalControls}>
        {props.value.type === 'date' && (
          <DatetimePicker
            value={props.value.date}
            onChange={(v) => props.onChange({ type: 'date', date: v || new Date() })}
            disabled={props.disabled}
          />
        )}
        {props.value.type === 'timestamp' && (
          <Input
            value={props.value.ts}
            placeholder="UNIX timestamp in ms, or ISO-8601"
            onChange={(v) => props.onChange({ type: 'timestamp', ts: v })}
          />
        )}
        {props.value.type === 'quickDate' && (
          <SmallButton
            onClick={() => {
              if (props.value.type !== 'quickDate') {
                return;
              }

              const relativeTo = new Date();
              setLatestSelectedDate(relativeTo);
              props.onChange({ ...props.value, relativeTo });
            }}
            type='primary'
            text='Actualize from now'
          />
        )}
      </div>
    </div>
  );
}

export default StartFromInput;
