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
  disabled?: boolean,
  clearable?: boolean,
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
        clearIcon={props.clearable ? <div className={s.SvgIcon}><SvgIcon svg={clearIcon} /></div> : null}
        disableClock={true}
        showLeadingZeros={true}
        maxDetail="second"
        disabled={props.disabled}
      />
    </div>
  );
}

export default DatetimePicker;
