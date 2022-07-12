import React from 'react';
import s from './DatetimePicker.module.css'
import Picker from 'react-datetime-picker/dist/entry.nostyle';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import 'react-datetime-picker/dist/DateTimePicker.css';

export type DatetimePickerProps = {
  value: Date | undefined,
  onChange: (v: Date | undefined) => void,
};

const DatetimePicker: React.FC<DatetimePickerProps> = (props) => {
  return (
    <div className={s.DatetimePicker}>
      <Picker
        value={props.value}
        onChange={(v: Date | null) => props.onChange(v || undefined)}
        className={s.Picker}
        calendarClassName={s.Calendar}
        calendarIcon={undefined}
        clearIcon={undefined}
        disableClock={true}
        disabled={false}
        maxDetail="second"
      />
    </div>
  );
}

export default DatetimePicker;
