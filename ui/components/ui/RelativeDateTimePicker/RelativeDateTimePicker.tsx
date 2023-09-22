import React from 'react';
import s from './RelativeDateTimePicker.module.css'
import { DateTimeUnit, RelativeDateTime } from '../../TopicPage/Messages/types';
import Select from '../Select/Select';
import FormItem from '../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../ConfigurationTable/FormLabel/FormLabel';
import Checkbox from '../Checkbox/Checkbox';
import Input from '../Input/Input';

export type RelativeDateTimePickerProps = {
  value: RelativeDateTime;
  onChange: (value: RelativeDateTime) => void;
};

const pluralize = (n: number, singular: string) => {
  return n === 1 ? singular : `${singular}s`;
};

const RelativeDateTimePicker: React.FC<RelativeDateTimePickerProps> = (props) => {
  return (
    <div className={s.RelativeDateTimePicker}>
      <FormItem>
        <Select<DateTimeUnit>
          list={[
            { type: 'item', title: pluralize(props.value.value, 'Second'), value: 'second' },
            { type: 'item', title: pluralize(props.value.value, 'Minute'), value: 'minute' },
            { type: 'item', title: pluralize(props.value.value, 'Hour'), value: 'hour' },
            { type: 'item', title: pluralize(props.value.value, 'Day'), value: 'day' },
            { type: 'item', title: pluralize(props.value.value, 'Week'), value: 'week' },
            { type: 'item', title: pluralize(props.value.value, 'Month'), value: 'month' },
            { type: 'item', title: pluralize(props.value.value, 'Year'), value: 'year' },
          ]}
          value={props.value.unit}
          onChange={v => props.onChange({ ...props.value, unit: v })}
        />
        <Input
          type="number"
          value={String(props.value.value)}
          onChange={(v) => props.onChange({ ...props.value, value: Number(v) })}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Is round" />
        <Checkbox
          checked={props.value.isRoundToUnitStart}
          onChange={(v) => props.onChange({ ...props.value, isRoundToUnitStart: v })}
        />
      </FormItem>
    </div>
  );
}

export default RelativeDateTimePicker;
