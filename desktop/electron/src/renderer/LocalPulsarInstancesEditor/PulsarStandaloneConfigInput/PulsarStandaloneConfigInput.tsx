import React from 'react';
import s from './PulsarStandaloneConfigInput.module.css'
import { LocalPulsarInstance, PulsarStandaloneConfig } from '../../../main/api/local-pulsar-instances/types';
import FormItem from '../../ui/FormItem/FormItem';
import FormLabel from '../../ui/FormLabel/FormLabel';
import Input from '../../ui/Input/Input';
import CodeEditor from '../../ui/CodeEditor/CodeEditor';
import PulsarDistributionPickerButton from '../PulsarDistributionPickerButton/PulsarDistributionPickerButton';

export type PulsarStandaloneConfigInputProps = {
  value: PulsarStandaloneConfig,
  onChange: (v: PulsarStandaloneConfig) => void
};

const PulsarStandaloneConfigInput: React.FC<PulsarStandaloneConfigInputProps> = (props) => {
  return (
    <div className={s.PulsarStandaloneConfigInput}>
      <FormItem>
        <FormLabel content="Pulsar Version" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12rem' }}>
          <strong>{props.value.pulsarVersion}</strong>
          <PulsarDistributionPickerButton
            onSelectVersion={(v) => props.onChange({ ...props.value, pulsarVersion: v })}
            buttonText='Select Another Version'
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel content="standalone.conf" />
        <CodeEditor
          value={props.value.standaloneConf || ''}
          onChange={(v) => props.onChange({ ...props.value, standaloneConf: v || '' })}
          language='plaintext'
          height='200rem'
        />
      </FormItem>

      <div style={{ display: 'flex', gap: '48rem' }}>
        <FormItem>
          <FormLabel content="Bookies count" />
          <div style={{ maxWidth: '100rem' }}>
            <Input
              value={String(props.value.numBookies) || ''}
              onChange={(v) => props.onChange({ ...props.value, numBookies: Number(v) })}
              inputProps={{ type: 'number', min: 1 }}
            />
          </div>
        </FormItem>

        <FormItem>
          <FormLabel content="Pulsar service port" />
          <div style={{ maxWidth: '100rem' }}>
            <Input
              value={String(props.value.pulsarServicePort) || ''}
              onChange={(v) => props.onChange({ ...props.value, pulsarServicePort: Number(v) })}
              inputProps={{ type: 'number' }}
            />
          </div>
        </FormItem>

        <FormItem>
          <FormLabel content="HTTP service port" />
          <div style={{ maxWidth: '100rem' }}>
            <Input
              value={String(props.value.httpServicePort) || ''}
              onChange={(v) => props.onChange({ ...props.value, httpServicePort: Number(v) })}
              inputProps={{ type: 'number' }}
            />
          </div>
        </FormItem>
      </div>

      <FormItem>
        <FormLabel content="i" />
        <CodeEditor
          value={props.value.standaloneConf || ''}
          onChange={(v) => props.onChange({ ...props.value, standaloneConf: v || '' })}
          language='plaintext'
          height='200rem'
        />
      </FormItem>
    </div>
  );
}

export default PulsarStandaloneConfigInput;
