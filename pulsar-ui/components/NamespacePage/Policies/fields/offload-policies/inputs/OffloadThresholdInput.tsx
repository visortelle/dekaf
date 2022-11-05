import { OffloadThreshold } from "../types";

import React from 'react';
import s from './OffloadThresholdInput.module.css'
import sf from '../../../../../ui/ConfigurationTable/form.module.css';
import Select from "../../../../../ui/Select/Select";
import MemorySizeInput from "../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput";

export type OffloadThresholdInputProps = {
  value: OffloadThreshold,
  onChange: (value: OffloadThreshold) => void,
};

const OffloadThresholdInput: React.FC<OffloadThresholdInputProps> = (props) => {
  return (
    <div className={s.OffloadThresholdInput}>
      <div className={sf.FormItem}>
        <div className={sf.FormLabel}>Threshold</div>
        <Select<OffloadThreshold['type']>
          value={props.value.type}
          list={[
            { type: 'item', value: 'disable-offload', title: 'Disable offload' },
            { type: 'item', value: 'offload-as-soon-as-possible', title: 'Offload as soon a possible' },
            { type: 'item', value: 'offload-when-topic-storage-reaches-threshold', title: 'Offload when topic storage reaches threshold' },
          ]}
          onChange={v => {
            switch (v) {
              case 'disable-offload': props.onChange({ type: 'disable-offload' }); break;
              case 'offload-as-soon-as-possible': props.onChange({ type: 'offload-as-soon-as-possible' }); break;
              case 'offload-when-topic-storage-reaches-threshold': props.onChange({ type: 'offload-when-topic-storage-reaches-threshold', bytes: 1024 * 1024 * 1024 }); break;
            }
          }}
        />
      </div>
      {props.value.type === 'offload-when-topic-storage-reaches-threshold' && (
        <div className={sf.FormItem}>
          <MemorySizeInput
            initialValue={props.value.bytes}
            onChange={v => props.onChange({ type: 'offload-when-topic-storage-reaches-threshold', bytes: v })}
          />
        </div>
      )}
    </div>
  );
}

export default OffloadThresholdInput;
