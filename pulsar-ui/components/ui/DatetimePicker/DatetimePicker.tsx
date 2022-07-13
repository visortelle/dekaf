import React from 'react';
import s from './DatetimePicker.module.css'
import Picker from 'react-datetime-picker/dist/entry.nostyle';
import SvgIcon from '../SvgIcon/SvgIcon';
import clearIcon from '!!raw-loader!./clear.svg';
import calendarIcon from '!!raw-loader!./calendar.svg';
import { usePrevious } from '../../app/hooks/use-previous';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import 'react-datetime-picker/dist/DateTimePicker.css';

export type DatetimePickerProps = {
  value: Date | undefined,
  onChange: (v: Date | undefined) => void,
  disabled?: boolean,
};

const DatetimePicker: React.FC<DatetimePickerProps> = (props) => {
  const prevValue = usePrevious(props.value);

  return (
    <div className={s.DatetimePicker}>
      <Picker
        value={props.value}
        onChange={(v: Date | null) => {
          if (prevValue !== undefined && props.value?.getTime() !== prevValue.getTime()) {
            console.log('prevDate', prevValue, 'newDate', props.value);
            props.onChange(v || undefined);
          }
        }}
        className={s.Picker}
        calendarClassName={s.Calendar}
        calendarIcon={<div className={s.SvgIcon}><SvgIcon svg={calendarIcon} /></div>}
        clearIcon={<div className={s.SvgIcon}><SvgIcon svg={clearIcon} /></div>}
        disableClock={true}
        showLeadingZeros={true}
        maxDetail="second"
        disabled={props.disabled}
      />
    </div>
  );
}

export default DatetimePicker;
