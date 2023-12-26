import React from 'react';
import s from './DatetimePicker.module.css'
import Picker from 'react-datetime-picker/dist/entry.nostyle';
import SvgIcon from '../SvgIcon/SvgIcon';
import clearIcon from './clear.svg';
import calendarIcon from './calendar.svg';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import 'react-datetime-picker/dist/DateTimePicker.css';

export type DatetimePickerProps = {
  value: Date | undefined,
  onChange: (v: Date | undefined) => void,
  disabled?: boolean,
  clearable?: boolean,
  isReadOnly?: boolean
};

const DatetimePicker: React.FC<DatetimePickerProps> = (props) => {
  return (
    <div
      className={`
        ${s.DatetimePicker}
        ${props.isReadOnly ? s.ReadOnly : ''}
      `}
    >
      <Picker
        value={props.value}
        onChange={(v: Date | null) => props.onChange(v || undefined)}
        className={s.Picker}
        calendarClassName={s.Calendar}
        calendarIcon={<div className={s.SvgIcon}><SvgIcon svg={calendarIcon} /></div>}
        clearIcon={props.clearable ? <div className={s.SvgIcon}><SvgIcon svg={clearIcon} /></div> : null}
        locale="en-GB"
        use12Hours={false}
        showLeadingZeros={true}
        maxDetail="second"
        disabled={props.disabled || props.isReadOnly}
      />
    </div>
  );
}

export default DatetimePicker;
