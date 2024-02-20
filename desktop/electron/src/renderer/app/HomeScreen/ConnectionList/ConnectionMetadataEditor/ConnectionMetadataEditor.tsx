import React from 'react';
import s from './ConnectionMetadataEditor.module.css'
import { ConnectionMetadata } from '../../../../../main/api/dekaf/types';
import FormItem from '../../../../ui/FormItem/FormItem';
import FormLabel from '../../../../ui/FormLabel/FormLabel';
import Input from '../../../../ui/Input/Input';
import Toggle from '../../../../ui/Toggle/Toggle';
import ColorPickerButton from '../../../../ui/ColorPickerButton/ColorPickerButton';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import { genRandomName } from './gen-random-name';
import repeatIcon from './repeat.svg';

export type ConnectionMetadataEditorProps = {
  value: ConnectionMetadata,
  onChange: (v: ConnectionMetadata) => void,
};

const ConnectionMetadataEditor: React.FC<ConnectionMetadataEditorProps> = (props) => {
  return (
    <div className={s.ConnectionMetadataEditor}>
      <FormItem>
        <FormLabel
          content={`Name`}
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

        <div style={{ width: '420rem', display: 'flex', gap: '8rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input
              value={props.value.name}
              onChange={(v) => props.onChange({ ...props.value, name: v })}
            />
          </div>
          <SmallButton
            type='regular'
            onClick={() => props.onChange({ ...props.value, name: genRandomName() })}
            title="Regenerate random name"
            svgIcon={repeatIcon}
            appearance='borderless-semitransparent'
          />
        </div>

        <div style={{ fontSize: '14rem', padding: '12rem 0' }}><strong>ID:</strong> {props.value.id}</div>
      </FormItem>

      <FormItem>
        <FormLabel
          content={`Color`}
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


    </div>
  );
}

export default ConnectionMetadataEditor;
