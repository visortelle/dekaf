import React from 'react';
import s from './LocalPulsarInstanceEditor.module.css'
import PulsarStandaloneConfigInput from './PulsarStandaloneConfigInput/PulsarStandaloneConfigInput';
import { LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import ConnectionMetadataEditor from '../ConnectionMetadataEditor/ConnectionMetadataEditor';

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
      <ConnectionMetadataEditor
        value={props.value.metadata}
        onChange={(v) => props.onChange({ ...props.value, metadata: v })}
      />
      <PulsarStandaloneConfigInput
        value={props.value.config}
        onChange={(v) => props.onChange({ ...props.value, config: v })}
      />
    </div>
  );
}

export default LocalPulsarInstanceEditor;
