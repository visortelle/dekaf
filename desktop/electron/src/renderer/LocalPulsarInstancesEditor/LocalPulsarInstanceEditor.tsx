import React from 'react';
import s from './LocalPulsarInstanceEditor.module.css'
import PulsarStandaloneConfigInput from './PulsarStandaloneConfigInput/PulsarStandaloneConfigInput';
import { LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import FormItem from '../ui/FormItem/FormItem';
import FormLabel from '../ui/FormLabel/FormLabel';
import Input from '../ui/Input/Input';
import ColorPickerButton from '../ui/ColorPickerButton/ColorPickerButton';
import Toggle from '../ui/Toggle/Toggle';

export type LocalPulsarInstanceEditorProps = {
  value: LocalPulsarInstance,
  onChange: (v: LocalPulsarInstance) => void
};

const LocalPulsarInstanceEditor: React.FC<LocalPulsarInstanceEditorProps> = (props) => {
  if (props.value.config.type !== 'pulsar-standalone') {
    return <>Only Pulsar Standalone is supported at this moment.</>
  }

  return (
    <div className={s.LocalPulsarInstanceEditor}>
      <FormItem>
        <FormLabel content="Instance Name" isRequired />
        <Input
          value={props.value.name}
          onChange={(v) => props.onChange({ ...props.value, name: v })}
        />
      </FormItem>

      <FormItem>
        <FormLabel content="Color" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
          <Toggle
            value={props.value.color !== undefined}
            onChange={(v) => {
              props.onChange({
                ...props.value,
                color: v ? 'teal-700' : undefined
              });
            }}
          />
          {props.value.color !== undefined && <ColorPickerButton
            value={props.value.color || ''}
            onChange={(v) => props.onChange({ ...props.value, color: v })}
          />}
        </div>
      </FormItem>

      <PulsarStandaloneConfigInput
        value={props.value.config.config}
        onChange={(v) => props.onChange({ ...props.value, config: { ...props.value.config, config: v } })}
      />
    </div>
  );
}

export default LocalPulsarInstanceEditor;
