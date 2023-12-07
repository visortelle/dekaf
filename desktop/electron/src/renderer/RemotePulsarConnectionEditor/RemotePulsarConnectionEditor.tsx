import React from 'react';
import s from './RemotePulsarConnectionEditor.module.css'
import { RemotePulsarConnection } from '../../main/api/remote-pulsar-connections/types';
import ConnectionMetadataEditor from '../ConnectionMetadataEditor/ConnectionMetadataEditor';
import FormItem from '../ui/FormItem/FormItem';
import FormLabel from '../ui/FormLabel/FormLabel';
import Toggle from '../ui/Toggle/Toggle';
import { cloneDeep } from 'lodash';
import Input from '../ui/Input/Input';
import CredentialsEditor from './pulsar-auth/Editor/CredentialsEditor/CredentialsEditor';
import { H2 } from '../ui/H/H';
import A from '../ui/A/A';

export type RemotePulsarConnectionEditorProps = {
  value: RemotePulsarConnection,
  onChange: (v: RemotePulsarConnection) => void
};

const RemotePulsarConnectionEditor: React.FC<RemotePulsarConnectionEditorProps> = (props) => {
  return (
    <div className={s.RemotePulsarConnectionEditor}>
      <div className={s.CredentialsMetadataEditor}>
        <FormItem>
          <ConnectionMetadataEditor
            value={props.value.metadata}
            onChange={v => props.onChange({ ...props.value, metadata: v })}
            flavor='connection'
          />
        </FormItem>
      </div>

      <div style={{ marginBottom: '6rem' }}>
        <div style={{ padding: '0 24rem 0 24rem' }}>
          <H2>Authentication and TLS</H2>
        </div>
        <div style={{ padding: '0 24rem 24rem 24rem' }}>
          <A isExternalLink href="https://pulsar.apache.org/docs/next/security-overview/">Pulsar security overview</A>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <div style={{ padding: '0 24rem' }}>
              <Toggle
                value={props.value.config.auth !== undefined}
                onChange={(v) => {
                  const newConfig = cloneDeep(props.value.config);
                  newConfig.auth = v ? { type: "authParamsString", authPluginClassName: '', authParams: '' } : undefined;
                  props.onChange({ ...props.value, config: newConfig });
                }}
              />
              <FormLabel
                content="Authentication"
              />
            </div>
            {props.value.config.auth !== undefined &&
              <div style={{ borderBottom: '1px solid var(--border-color)', padding: '12rem 24rem 18rem' }}>
                <CredentialsEditor
                  value={props.value.config.auth}
                  onChange={(v) => {
                    const newConfig = cloneDeep(props.value.config);
                    newConfig.auth = v;
                    props.onChange({ ...props.value, config: newConfig });
                  }}
                />
              </div>}
          </FormItem>
        </div>


      </div>
      <div className={s.Form}>
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
              content="TLS Trust Certs File Path"
            />

            {props.value.config.pulsarTlsTrustCertsFilePath !== undefined && <Input
              value={props.value.config.pulsarTlsTrustCertsFilePath}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustCertsFilePath = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={Boolean(props.value.config.pulsarAllowTlsInsecureConnection)}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarAllowTlsInsecureConnection = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="Allow TLS Insecure Connection"
            />
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={Boolean(props.value.config.pulsarEnableTlsHostnameVerification)}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarEnableTlsHostnameVerification = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="Enable TLS Hostname Verification"
            />
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarSslProvider !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarSslProvider = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="SSL Provider"
            />

            {props.value.config.pulsarSslProvider !== undefined && <Input
              value={props.value.config.pulsarSslProvider}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarSslProvider = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={Boolean(props.value.config.pulsarUseKeyStoreTls)}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarUseKeyStoreTls = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="Use Key Store TLS"
            />
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsKeyStoreType !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyStoreType = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Key Store Type"
            />

            {props.value.config.pulsarTlsKeyStoreType !== undefined && <Input
              value={props.value.config.pulsarTlsKeyStoreType}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyStoreType = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsKeyStorePath !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyStorePath = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Key Store Path"
            />

            {props.value.config.pulsarTlsKeyStorePath !== undefined && <Input
              value={props.value.config.pulsarTlsKeyStorePath}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyStorePath = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsKeyStorePassword !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyStorePassword = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Key Store Password"
            />

            {props.value.config.pulsarTlsKeyStorePassword !== undefined && <Input
              value={props.value.config.pulsarTlsKeyStorePassword}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsKeyStorePassword = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
              inputProps={{ type: 'password' }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsTrustStoreType !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustStoreType = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Trust Store Type"
            />

            {props.value.config.pulsarTlsTrustStoreType !== undefined && <Input
              value={props.value.config.pulsarTlsTrustStoreType}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustStoreType = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsTrustStorePath !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustStoreType = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Trust Store Path"
            />

            {props.value.config.pulsarTlsTrustStorePath !== undefined && <Input
              value={props.value.config.pulsarTlsTrustStorePath}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustStorePath = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsTrustStorePassword !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustStorePassword = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Trust Store Password"
            />

            {props.value.config.pulsarTlsTrustStorePassword !== undefined && <Input
              value={props.value.config.pulsarTlsTrustStorePassword}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsTrustStorePassword = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
              inputProps={{ type: "password" }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsCiphers !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsCiphers = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Ciphers"
            />

            {props.value.config.pulsarTlsCiphers !== undefined && <Input
              value={props.value.config.pulsarTlsCiphers}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsCiphers = v;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />}
          </FormItem>
        </div>

        <div className={s.ToggleAndInput}>
          <FormItem>
            <Toggle
              value={props.value.config.pulsarTlsProtocols !== undefined}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsProtocols = v ? '' : undefined;
                props.onChange({ ...props.value, config: newConfig });
              }}
            />
            <FormLabel
              content="TLS Protocols"
            />

            {props.value.config.pulsarTlsProtocols !== undefined && <Input
              value={props.value.config.pulsarTlsProtocols}
              onChange={(v) => {
                const newConfig = cloneDeep(props.value.config);
                newConfig.pulsarTlsProtocols = v;
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
