import React from 'react';
import s from './LocalPulsarConfigInput.module.css'
import { LocalPulsarConfig } from '../../main/api/local-pulsar/types';
import FormItem from '../ui/FormItem/FormItem';
import FormLabel from '../ui/FormLabel/FormLabel';
import Input from '../ui/Input/Input';

export type LocalPulsarConfigInputProps = {
  value: LocalPulsarConfig,
  onChange: (v: LocalPulsarConfig) => void
};

const LocalPulsarConfigInput: React.FC<LocalPulsarConfigInputProps> = (props) => {
  return (
    <div className={s.LocalPulsarConfigInput}>
      <FormItem>
        <FormLabel content="Name" />
        <Input
          value={props.value.name}
          onChange={(v) => props.onChange({ ...props.value, name: v })}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Version" />
        <Input
          value={props.value.version}
          onChange={(v) => props.onChange({ ...props.value, version: v })}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Color" />
        <Input
          value={props.value.color || ''}
          onChange={(v) => props.onChange({ ...props.value, color: v })}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="standalone.conf" />
        <Input
          value={props.value.standaloneConf || ''}
          onChange={(v) => props.onChange({ ...props.value, standaloneConf: v })}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Bookies count" />
        <Input
          value={String(props.value.numBookies) || ''}
          onChange={(v) => props.onChange({ ...props.value, numBookies: Number(v) })}
          inputProps={{ type: 'number' }}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Pulsar service port" />
        <Input
          value={String(props.value.pulsarServicePort) || ''}
          onChange={(v) => props.onChange({ ...props.value, pulsarServicePort: Number(v) })}
          inputProps={{ type: 'number' }}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Http service port" />
        <Input
          value={String(props.value.httpServicePort) || ''}
          onChange={(v) => props.onChange({ ...props.value, httpServicePort: Number(v) })}
          inputProps={{ type: 'number' }}
        />
      </FormItem>
    </div>
  );
}

export default LocalPulsarConfigInput;
