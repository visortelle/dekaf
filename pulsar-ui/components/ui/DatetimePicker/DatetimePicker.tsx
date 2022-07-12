import React from 'react';
import s from './DatetimePicker.module.css'
import Picker from 'react-datetime-picker/dist/entry.nostyle';
import SvgIcon from '../SvgIcon/SvgIcon';
import clearIcon from '!!raw-loader!./clear.svg';
import calendarIcon from '!!raw-loader!./calendar.svg';
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
        calendarIcon={<div className={s.SvgIcon}><SvgIcon svg={calendarIcon} /></div>}
        clearIcon={<div className={s.SvgIcon}><SvgIcon svg={clearIcon} /></div>}
        disableClock={true}
        disabled={false}
        showLeadingZeros={true}
        maxDetail="second"
      />
    </div>
  );
}

export default DatetimePicker;
