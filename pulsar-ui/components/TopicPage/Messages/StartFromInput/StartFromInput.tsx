import React, { useCallback, useEffect, useMemo, useState } from 'react';
import s from './StartFromInput.module.css'
import SelectInput, { List } from '../../../ui/ConfigurationTable/SelectInput/SelectInput';
import DatetimePicker from '../../../ui/DatetimePicker/DatetimePicker';

export type StartFrom = { type: 'date', date: Date | undefined } | { type: 'timestamp', timestamp: number } | { type: 'earliest' } | { type: 'latest' }
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
    { title: 'From latest', value: 'latest' },
    { title: 'From earliest', value: 'earliest' },
    { title: 'From date', value: 'date' },
    { title: 'From timestamp', value: 'timestamp' },
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

      {startFromType === 'date' && <DatetimePicker value={fromDate} onChange={(v) => { console.log('change'); setFromDate(v) }} disabled={props.disabled} />}
    </div>
  );
}

export default StartFromInput;
