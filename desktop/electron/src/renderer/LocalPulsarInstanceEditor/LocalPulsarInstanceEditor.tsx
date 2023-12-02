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
  if (props.value.config.type !== 'PulsarStandaloneConfig') {
    return <>Only Pulsar Standalone is supported at this moment.</>
  }

  return (
    <div className={s.LocalPulsarInstanceEditor}>
      <FormItem>
        <FormLabel
          content="Instance Name"
          help={(
            <>
              <p>An <strong>instance</strong> is a specific deployment of the Pulsar system.</p>
              <p>This could be on a single server for a small application or spread across a cluster of servers for high performance and reliability.</p>
              <p>A Pulsar <strong>instance</strong> consists of one or more Pulsar <strong>clusters</strong>.</p>
              <p>Each Pulsar <strong>cluster</strong> consists one or more <strong>brokers</strong> (stateless compute nodes), <strong>bookies</strong> (storage nodes), and <strong>metadata storage</strong> (e.g. Zookeeper, Oxia, etcd, or RocksDB).</p>
              <p>The name should be unique among other local instances and remote connections.</p>
            </>
          )}
          isRequired
        />
        <div style={{ width: '420rem' }}>
          <Input
            value={props.value.name}
            onChange={(v) => props.onChange({ ...props.value, name: v })}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="Instance Color"
          help={(
            <>
              <p>
                You can optionally assign a color for this instance to visually distinguish it with other local instances and remote connections.
              </p>
              <p>
                It's a good practice to highlight connections to live systems, as actions taken by mistake may lead to a service or data disruption.
              </p>
            </>
          )}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
          <Toggle
            value={props.value.color !== undefined}
            onChange={(v) => {
              props.onChange({
                ...props.value,
                color: v ? 'indigo-400' : undefined
              });
            }}
          />
          <div style={{ visibility: props.value.color === undefined ? 'hidden' : 'visible' }}>
            <ColorPickerButton
              value={props.value.color || ''}
              onChange={(v) => props.onChange({ ...props.value, color: v })}
            />
          </div>
        </div>
      </FormItem>

      <PulsarStandaloneConfigInput
        value={props.value.config}
        onChange={(v) => props.onChange({ ...props.value, config: v })}
      />
    </div>
  );
}

export default LocalPulsarInstanceEditor;
