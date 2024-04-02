import React from 'react';
import s from './PulsarProducerConfigInput.module.css'
import { PulsarProducerConfig } from './pulsar-producer-config';
import BatcherBuilderInput from './batcher-builder/BatcherBuilderInput/BatcherBuilderInput';
import ProducerNameInput from './producer-name/ProducerNameInput/ProducerNameInput';

export type PulsarProducerConfigInputProps = {
  value: PulsarProducerConfig,
  onChange: (v: PulsarProducerConfig) => void
};

const PulsarProducerConfigInput: React.FC<PulsarProducerConfigInputProps> = (props) => {
  return (
    <div className={s.PulsarProducerConfigInput}>
      <ProducerNameInput
        value={props.value.producerName}
        onChange={(v) => props.onChange({ ...props.value, producerName: v })}
      />

      <BatcherBuilderInput
        value={props.value.batcherBuilder}
        onChange={(v) => props.onChange({ ...props.value, batcherBuilder: v })}
      />
    </div>
  );
}

export default PulsarProducerConfigInput;
