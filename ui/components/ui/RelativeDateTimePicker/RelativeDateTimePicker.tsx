import React, { useEffect, useState } from 'react';
import s from './RelativeDateTimePicker.module.css'
import { DateTimeUnit, RelativeDateTime } from '../ConsumerSession/types';
import Select from '../Select/Select';
import Checkbox from '../Checkbox/Checkbox';
import Input from '../Input/Input';
import Toggle from '../Toggle/Toggle';
import { relativeDateTimeValueFromText, relativeDateTimeValueMax } from './relative-date-time';

export type RelativeDateTimePickerProps = {
  value: RelativeDateTime;
  onChange: (value: RelativeDateTime) => void;
  isReadOnly?: boolean
};

const pluralize = (n: number, singular: string) => {
  return n === 1 ? singular : `${singular}s`;
};

const RelativeDateTimePicker: React.FC<RelativeDateTimePickerProps> = (props) => {
  // The typed text, kept here rather than derived from the committed value on every render, so an
  // in-progress or refused entry stays on screen (and stays correctable) without ever becoming the
  // instant the session starts from. Clearing the field to retype it is the ordinary case, and it
  // used to commit 0 - "now" - on the way through.
  const [draft, setDraft] = useState<string>(() => String(props.value.value));

  // Adopt a value that changed elsewhere (a library item that resolved, a picked item), but leave a
  // draft that already means the same number alone.
  useEffect(() => {
    if (relativeDateTimeValueFromText(draft) !== props.value.value) {
      setDraft(String(props.value.value));
    }
  }, [props.value.value]);

  const onDraftChange = (v: string) => {
    setDraft(v);

    const value = relativeDateTimeValueFromText(v);
    if (value !== undefined) {
      props.onChange({ ...props.value, value });
    }
  };

  const isInvalid = relativeDateTimeValueFromText(draft) === undefined;

  return (
    <div className={s.RelativeDateTimePicker}>
      <div className={s.ValueAndUnit}>
        <div className={s.Value}>
          <Input
            testId="relative-date-time-value"
            type="number"
            value={draft}
            onChange={onDraftChange}
            isError={isInvalid}
            inputProps={{ min: 0, max: relativeDateTimeValueMax, step: 1 }}
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

      {isInvalid && (
        <div className={s.Error} data-testid="relative-date-time-value-error">
          {/* A refused entry does not undo the last valid one, so a session started now would use
              THAT - saying which number that is turns a silent difference into a visible one. */}
          Enter a whole number of {props.value.unit}s from 0 to {relativeDateTimeValueMax}. The value in effect is still {props.value.value}.
        </div>
      )}

      <div className={s.Checkbox}>
        <Toggle
          value={props.value.isRoundedToUnitStart}
          onChange={(v) => props.onChange({ ...props.value, isRoundedToUnitStart: v })}
          label={`Round to beginning of the ${props.value.unit}`}
          isReadOnly={props.isReadOnly}
        />
      </div>
    </div>
  );
}

export default RelativeDateTimePicker;
