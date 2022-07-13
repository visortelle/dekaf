import React, { useCallback, useEffect, useMemo, useState } from 'react';
import s from './StartFromInput.module.css'
import SelectInput, { List } from '../../../ui/ConfigurationTable/SelectInput/SelectInput';

export type StartFrom = { type: 'date', date: Date } | { type: 'timestamp', timestamp: number } | { type: 'earliest' } | { type: 'latest' }
export type StartFromType = StartFrom['type'];

export type StartFromInputProps = {
  value: StartFrom,
  onChange: (value: StartFrom) => void,
  disabled?: boolean
};

const StartFromInput: React.FC<StartFromInputProps> = (props) => {
  const [startFromType, setStartFromType] = useState<StartFromType>(props.value.type);

  const list = useMemo<List<StartFromType>>(() => [
    { title: 'Latest', value: 'latest' },
    { title: 'Earliest', value: 'earliest' },
    { title: 'Date', value: 'date' },
    { title: 'Timestamp', value: 'timestamp' },
  ], []);

  useEffect(() => {
    switch (startFromType) {
      case 'earliest': props.onChange({ type: 'earliest' }); break;
      case 'latest': props.onChange({ type: 'latest' }); break;
    }
  }, [startFromType]);

  const onChange = useCallback((v: StartFrom) => props.onChange(v), [props.onChange]);

  return (
    <div className={s.StartFromInput}>
      <SelectInput<StartFromType>
        list={list}
        value={startFromType}
        onChange={setStartFromType}
        disabled={props.disabled}
      />
    </div>
  );
}

export default StartFromInput;
