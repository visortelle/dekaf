import React from 'react';
import s from './LocalPulsarInstanceEditor.module.css'
import PulsarStandaloneConfigInput from './PulsarStandaloneConfigInput/PulsarStandaloneConfigInput';
import { LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import ConnectionMetadataEditor from '../ConnectionMetadataEditor/ConnectionMetadataEditor';
import { H2 } from '../ui/H/H';

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
      <div style={{ padding: '24rem', borderBottom: '1px solid var(--border-color)', marginBottom: '12rem' }}>
        <ConnectionMetadataEditor
          value={props.value.metadata}
          onChange={(v) => props.onChange({ ...props.value, metadata: v })}
          flavor='instance'
        />
      </div>

      <div style={{ padding: '12rem 24rem' }}>
        <div style={{ marginBottom: '12rem' }}>
          <H2>Instance Configuration</H2>
        </div>

        <PulsarStandaloneConfigInput
          value={props.value.config}
          onChange={(v) => props.onChange({ ...props.value, config: v })}
        />
      </div>
    </div>
  );
}

export default LocalPulsarInstanceEditor;
