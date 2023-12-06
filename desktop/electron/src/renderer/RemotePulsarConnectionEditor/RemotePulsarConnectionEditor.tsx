import React from 'react';
import s from './RemotePulsarConnectionEditor.module.css'
import { RemotePulsarConnection } from '../../main/api/remote-pulsar-connections/types';
import ConnectionMetadataEditor from '../ConnectionMetadataEditor/ConnectionMetadataEditor';
import FormItem from '../ui/FormItem/FormItem';
import FormLabel from '../ui/FormLabel/FormLabel';
import Toggle from '../ui/Toggle/Toggle';
import { cloneDeep } from 'lodash';
import Input from '../ui/Input/Input';

export type RemotePulsarConnectionEditorProps = {
  value: RemotePulsarConnection,
  onChange: (v: RemotePulsarConnection) => void
};

const RemotePulsarConnectionEditor: React.FC<RemotePulsarConnectionEditorProps> = (props) => {
  return (
    <div className={s.RemotePulsarConnectionEditor}>
      <ConnectionMetadataEditor
        value={props.value.metadata}
        onChange={v => props.onChange({ ...props.value, metadata: v })}
      />

      <div>
        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsKeyFilePath !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyFilePath = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Key File Path"
            />

            {props.value.config.pulsarTlsKeyFilePath !== undefined && <Input
              value={props.value.config.pulsarTlsKeyFilePath}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyFilePath = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsCertificateFilePath !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsCertificateFilePath = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Certificate File Path"
            />

            {props.value.config.pulsarTlsCertificateFilePath !== undefined && <Input
              value={props.value.config.pulsarTlsCertificateFilePath}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsCertificateFilePath = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsTrustCertsFilePath !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustCertsFilePath = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Certificate File Path"
            />

            {props.value.config.pulsarTlsCertificateFilePath !== undefined && <Input
              value={props.value.config.pulsarTlsCertificateFilePath}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsCertificateFilePath = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>


      </div>
    </div>
  );
}

export default RemotePulsarConnectionEditor;
