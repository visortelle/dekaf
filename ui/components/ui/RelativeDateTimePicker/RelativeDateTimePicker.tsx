import React, { useEffect } from 'react';
import s from './RelativeDateTimePicker.module.css'
import { DateTimeUnit, RelativeDateTime } from '../ConsumerSession/types';
import Select from '../Select/Select';
import Checkbox from '../Checkbox/Checkbox';
import Input from '../Input/Input';

export type RelativeDateTimePickerProps = {
  value: RelativeDateTime;
  onChange: (value: RelativeDateTime) => void;
  isReadOnly?: boolean
};

const pluralize = (n: number, singular: string) => {
  return n === 1 ? singular : `${singular}s`;
};

const RelativeDateTimePicker: React.FC<RelativeDateTimePickerProps> = (props) => {
  return (
    <div className={s.RelativeDateTimePicker}>
      <div className={s.ValueAndUnit}>
        <div className={s.Value}>
          <Input
            type="number"
            value={String(props.value.value)}
            onChange={(v) => props.onChange({ ...props.value, value: Number(v) })}
            isReadOnly={props.isReadOnly}
          />
        </div>

        <div className={s.Unit}>
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
            isReadOnly={props.isReadOnly}
          />
        </div>

        <strong>ago</strong>
      </div>

      <div className={s.Checkbox}>
        <Checkbox
          checked={props.value.isRoundedToUnitStart}
          onChange={(v) => props.onChange({ ...props.value, isRoundedToUnitStart: v })}
          isReadOnly={props.isReadOnly}
        />
        <strong>Round to beginning of the {props.value.unit}</strong>
      </div>
    </div>
  );
}

export default RelativeDateTimePicker;
