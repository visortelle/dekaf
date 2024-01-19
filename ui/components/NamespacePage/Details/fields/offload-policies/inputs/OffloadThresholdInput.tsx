import { OffloadThreshold } from "../types";

import React from 'react';
import s from './OffloadThresholdInput.module.css'
import sf from '../../../../../ui/ConfigurationTable/form.module.css';
import Select from "../../../../../ui/Select/Select";
import MemorySizeInput from "../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput";
import FormLabel from "../../../../../ui/ConfigurationTable/FormLabel/FormLabel";

export type OffloadThresholdInputProps = {
  value: OffloadThreshold,
  onChange: (value: OffloadThreshold) => void,
};

const OffloadThresholdInput: React.FC<OffloadThresholdInputProps> = (props) => {
  return (
    <div className={s.OffloadThresholdInput}>
      <div className={sf.FormItem}>
        <FormLabel
          content="Threshold"
          help={(
            <>
              <div>Namespace policy can be configured to offload data automatically once a threshold is reached. The threshold is based on the size of data that a topic has stored in a Pulsar cluster. Once the topic reaches the threshold, an offloading operation is triggered automatically.</div>
              <br />
              <div>Automatic offloading runs when a new segment is added to a topic log. If you set the threshold on a namespace, but few messages are being produced to the topic, the offloader does not work until the current segment is full.</div>
            </>
          )}
        />
        <Select<OffloadThreshold['type']>
          value={props.value.type}
          list={[
            { type: 'item', value: 'disabled-automatic-offloading', title: 'Disable automatic offloading' },
            { type: 'item', value: 'offload-as-soon-as-possible', title: 'Offload as soon a possible' },
            { type: 'item', value: 'offload-when-topic-storage-reaches-threshold', title: 'Offload when topic storage reaches threshold' },
          ]}
          onChange={v => {
            switch (v) {
              case 'disabled-automatic-offloading': props.onChange({ type: 'disabled-automatic-offloading' }); break;
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
