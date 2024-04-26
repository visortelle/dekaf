import React from 'react';
import s from './PulsarProducerConfigInput.module.css'
import { PulsarProducerConfig } from './pulsar-producer-config';
import BatcherBuilderInput from './batcher-builder/BatcherBuilderInput/BatcherBuilderInput';
import ProducerNameInput from './producer-name/ProducerNameInput/ProducerNameInput';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';
import Toggle from '../../../Toggle/Toggle';

export type PulsarProducerConfigInputProps = {
  value: PulsarProducerConfig | undefined,
  onChange: (v: PulsarProducerConfig | undefined) => void
};

const PulsarProducerConfigInput: React.FC<PulsarProducerConfigInputProps> = (props) => {
  return (
    <div className={s.PulsarProducerConfigInput}>
      <FormItem size='small'>
        <div>
          <FormLabel content="Advanced Config" />
          <Toggle
            value={props.value !== undefined}
            onChange={(v) => {
              if (!v) {
                props.onChange(undefined);
                return;
              }

              props.onChange({
                accessMode: undefined,
                addEncryptionKey: undefined,
                autoUpdatePartitions: undefined,
                autoUpdatePartitionsIntervalNanos: undefined,
                batcherBuilder: undefined,
                batchingMaxBytes: undefined,
                batchingMaxMessages: undefined,
                batchingMaxPublishDelayNanos: undefined,
                blockIfQueueFull: undefined,
                chunkMaxMessageSize: undefined,
                compressionType: undefined,
                defaultCryptoKeyReader: {},
                enableBatching: undefined,
                enableChunking: undefined,
                enableLazyStartPartitionedProducers: undefined,
                hashingScheme: undefined,
                initialSequenceId: undefined,
                maxPendingMessages: undefined,
                messageRoutingMode: undefined,
                producerName: undefined,
                properties: {},
                roundRobinRouterBatchingPartitionSwitchFrequency: undefined,
                sendTimeoutNanos: undefined,
              });
            }}
          />
        </div>
      </FormItem>

      <ProducerNameInput
        value={props.value?.producerName}
        onChange={(v) => {
          if (props.value === undefined) {
            return;
          }

          props.onChange({ ...props.value, producerName: v })
        }}
      />

      <BatcherBuilderInput
        value={props.value?.batcherBuilder}
        onChange={(v) => {
          if (props.value === undefined) {
            return;
          }

          props.onChange({ ...props.value, batcherBuilder: v })
        }}
      />
    </div>
  );
}

export default PulsarProducerConfigInput;
