import React, { useEffect, useState } from 'react';
import s from './PulsarStandaloneConfigInput.module.css'
import { PulsarStandaloneConfig } from '../../../main/api/local-pulsar-instances/types';
import FormItem from '../../ui/FormItem/FormItem';
import FormLabel from '../../ui/FormLabel/FormLabel';
import Input from '../../ui/Input/Input';
import CodeEditor from '../../ui/CodeEditor/CodeEditor';
import PulsarDistributionPickerButton from '../PulsarDistributionPickerButton/PulsarDistributionPickerButton';
import { H2 } from '../../ui/H/H';
import Toggle from '../../ui/Toggle/Toggle';
import KeyValueEditor, { recordFromIndexedKv, recordToIndexedKv } from '../../ui/KeyValueEditor/KeyValueEditor';
import { apiChannel } from '../../../main/channels';
import { cloneDeep } from 'lodash';
import { GetPulsarDistributionFileAtPath } from '../../../main/api/local-pulsar-distributions/types';
import MergeViewButton from '../../ui/MergeView/MergeViewButton/MergeViewButton';
import semver from 'semver';

const standaloneConfPath = "./conf/standalone.conf" as const;
const functionsWorkerYamlPath = "./conf/functions_worker.yml" as const;

function isMajorChange(version1: string, version2: string) {
  const major1 = semver.major(version1);
  const major2 = semver.major(version2);

  return major1 !== major2;
}


export type PulsarStandaloneConfigInputProps = {
  value: PulsarStandaloneConfig,
  onChange: (v: PulsarStandaloneConfig) => void
};

const PulsarStandaloneConfigInput: React.FC<PulsarStandaloneConfigInputProps> = (props) => {
  const [defaultStandaloneConfPerVersion, setDefaultStandaloneConfPerVersion] = useState<Record<string, string>>({});
  const [defaultFunctionsWorkerYmlPerVersion, setDefaultFunctionsWorkerYmlPerVersion] = useState<Record<string, string>>({});
  const [pulsarVersionChangeHistory, setPulsarVersionChangeHistory] = useState<string[]>([]);
  const originalPulsarVersion = pulsarVersionChangeHistory[0];

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "GetPulsarDistributionFileAtPathResult") {
        if (arg.path === standaloneConfPath) {
          setDefaultStandaloneConfPerVersion(v => ({ ...v, [arg.version]: arg.content }));
        } else if (arg.path === functionsWorkerYamlPath) {
          setDefaultFunctionsWorkerYmlPerVersion(v => ({ ...v, [arg.version]: arg.content }));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (props.value.standaloneConfContent === undefined && defaultStandaloneConfPerVersion[props.value.pulsarVersion] !== undefined) {
      const newValue = cloneDeep(props.value);
      newValue.standaloneConfContent = defaultStandaloneConfPerVersion[props.value.pulsarVersion];
      props.onChange(newValue);
      return;
    }
  }, [defaultStandaloneConfPerVersion, props.value.standaloneConfContent]);

  useEffect(() => {
    if (props.value.functionsWorkerConfContent === undefined && defaultFunctionsWorkerYmlPerVersion[props.value.pulsarVersion] !== undefined) {
      const newValue = cloneDeep(props.value);
      newValue.functionsWorkerConfContent = defaultFunctionsWorkerYmlPerVersion[props.value.pulsarVersion];
      props.onChange(newValue);
      return;
    }
  }, [defaultFunctionsWorkerYmlPerVersion, props.value.functionsWorkerConfContent]);

  useEffect(() => {
    function refreshDefaultConfigFiles() {
      const req1: GetPulsarDistributionFileAtPath = {
        type: "GetPulsarDistributionFileAtPath",
        version: props.value.pulsarVersion,
        path: standaloneConfPath
      }
      const req2: GetPulsarDistributionFileAtPath = {
        type: "GetPulsarDistributionFileAtPath",
        version: props.value.pulsarVersion,
        path: functionsWorkerYamlPath
      }
      window.electron.ipcRenderer.sendMessage(apiChannel, req1);
      window.electron.ipcRenderer.sendMessage(apiChannel, req2);
    }

    refreshDefaultConfigFiles();

    if (props.value.pulsarVersion !== pulsarVersionChangeHistory[pulsarVersionChangeHistory.length - 1]) {
      setPulsarVersionChangeHistory(v => v.concat([props.value.pulsarVersion]));
    }
  }, [props.value.pulsarVersion]);

  const isPulsarStandaloneConfSame = defaultStandaloneConfPerVersion[props.value.pulsarVersion] === props.value.standaloneConfContent;
  const isFunctionsWorkerYmlSame = defaultFunctionsWorkerYmlPerVersion[props.value.pulsarVersion] === props.value.functionsWorkerConfContent;

  return (
    <div className={s.PulsarStandaloneConfigInput}>
      <FormItem>
        <FormLabel content="Pulsar Version" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12rem' }}>
          <H2>{props.value.pulsarVersion}</H2>
          <PulsarDistributionPickerButton
            onSelectVersion={(v) => props.onChange({ ...props.value, pulsarVersion: v })}
            buttonText='Select Another Version'
          />
        </div>
      </FormItem>

      {pulsarVersionChangeHistory.length > 0 && !(isPulsarStandaloneConfSame && isFunctionsWorkerYmlSame) && isMajorChange(originalPulsarVersion, props.value.pulsarVersion) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem', marginBottom: '24rem', color: 'var(--accent-color-blue)', fontWeight: 'var(--font-weight-bold)', background: `var(--surface-color)`, borderRadius: '8rem', padding: '12rem' }}>
          <div>
            You selected Pulsar version from another release line.
            <br />
            It may be incompatible with your configuration files. Please review the changes:
          </div>

          {!isPulsarStandaloneConfSame && (
            <MergeViewButton
              onMerge={(v) => props.onChange({ ...props.value, standaloneConfContent: v })}
              buttonText='Review standalone.conf'
              originalContent={defaultStandaloneConfPerVersion[props.value.pulsarVersion] || ''}
              originalFileName={`New standalone.conf Pulsar v${props.value.pulsarVersion}`}
              modifiedContent={props.value.standaloneConfContent || ''}
              modifiedFileName={`Your standalone.conf Pulsar v${originalPulsarVersion}`}
              language='plaintext'
            />
          )}

          {!isFunctionsWorkerYmlSame && (
            <MergeViewButton
              onMerge={(v) => props.onChange({ ...props.value, functionsWorkerConfContent: v })}
              buttonText='Review functions_worker.yml'
              originalContent={defaultFunctionsWorkerYmlPerVersion[props.value.pulsarVersion] || ''}
              originalFileName={`New functions_worker.yml Pulsar v${props.value.pulsarVersion}`}
              modifiedContent={props.value.functionsWorkerConfContent || ''}
              modifiedFileName={`Your functions_worker.yml Pulsar v${originalPulsarVersion}`}
              language='plaintext'
            />
          )}
        </div>
      )}

      <FormItem>
        <FormLabel
          content="Wipe Data Before Each Launch"
          help={(
            <>
              <p>
                Remove all Pulsar instance resources and messages before each instance launch.
              </p>
              <p>
                It may be useful if you frequently need to test various scenarios on a fresh Pulsar instance.
              </p>
            </>
          )}
        />
        <div>
          <Toggle
            value={Boolean(props.value.wipeData)}
            onChange={(v) => props.onChange({ ...props.value, wipeData: v })}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="Pulsar Service Port"
          help={(
            <p>
              The <strong>Pulsar Service</strong> exposes <a target='_blank' href="https://pulsar.apache.org/docs/next/developing-binary-protocol">Pulsar binary protocol</a>, which producers and consumers use for communication with the Pulsar broker.
            </p>
          )}
        />
        <div style={{ maxWidth: '120rem' }}>
          <Input
            value={String(props.value.brokerServicePort) || ''}
            onChange={(v) => props.onChange({ ...props.value, brokerServicePort: Number(v) })}
            inputProps={{ type: 'number' }}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="Web Service Port"
          help={(
            <p>
              The <strong>Web Service</strong> exposes an HTTP API for administrative operations, operations, such as managing Pulsar resources.
            </p>
          )}
        />
        <div style={{ maxWidth: '120rem' }}>
          <Input
            value={String(props.value.webServicePort) || ''}
            onChange={(v) => props.onChange({ ...props.value, webServicePort: Number(v) })}
            inputProps={{ type: 'number' }}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="Bookies Count"
          help={(
            <>
              <p>
                Pulsar uses <a target="_blank" href="https://bookkeeper.apache.org/">Apache Bookkeeper</a> for reliably storing messages on disk.
              </p>
              <p>
                The term <strong>bookie</strong> refers to a node in Apache Bookkeeper.
              </p>
            </>
          )}
        />
        <div style={{ maxWidth: '120rem' }}>
          <Input
            value={String(props.value.numBookies) || ''}
            onChange={(v) => props.onChange({ ...props.value, numBookies: Number(v) })}
            inputProps={{ type: 'number', min: 1 }}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="Bookkeeper Port"
          help={(
            <>
              <p>
                Local bookies base port.
              </p>
              <p>
                Pulsar uses <a target="_blank" href="https://bookkeeper.apache.org/">Apache Bookkeeper</a> for reliably storing messages on disk.
              </p>
              <p>
                The term <strong>bookie</strong> refers to a node in Apache Bookkeeper.
              </p>
            </>
          )}
        />
        <div style={{ maxWidth: '120rem' }}>
          <Input
            value={String(props.value.bookkeeperPort) || ''}
            onChange={(v) => props.onChange({ ...props.value, bookkeeperPort: Number(v) })}
            inputProps={{ type: 'number' }}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="Stream Storage Port"
          help={(
            <p>
              Local bookies stream storage port.
            </p>
          )}
        />
        <div style={{ maxWidth: '120rem' }}>
          <Input
            value={String(props.value.streamStoragePort) || ''}
            onChange={(v) => props.onChange({ ...props.value, streamStoragePort: Number(v) })}
            inputProps={{ type: 'number' }}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="standalone.conf"
          help={(
            <>
              <p>
                We are running Pulsar in standalone mode, which is intended for local testing.
              </p>
              <p>
                The <strong>standalone.conf</strong> file is the main configuration file when running Pulsar in this way.
              </p>
              <p>
                When you run Pulsar in regular mode, the <strong>broker.conf</strong> file is used instead. The set of parameters is slightly different in both files.
              </p>
            </>
          )}
        />
        <CodeEditor
          value={props.value.standaloneConfContent || ''}
          onChange={(v) => props.onChange({ ...props.value, standaloneConfContent: v === '' ? undefined : v })}
          language='plaintext'
          height='420rem'
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="functions_worker.yml"
          help={(
            <>
              <p>
                <a target='_blank' href="https://pulsar.apache.org/docs/next/functions-overview/">Pulsar Functions</a> are a serverless computing framework that runs on top of Pulsar.
              </p>
              <p>
                This file contains the configuration for Pulsar Functions worker process.
              </p>
            </>
          )}
        />
        <CodeEditor
          value={props.value.functionsWorkerConfContent || ''}
          onChange={(v) => props.onChange({ ...props.value, functionsWorkerConfContent: v === '' ? undefined : v })}
          language='plaintext'
          height='420rem'
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Environment Variables"
          help={(
            <p>
              A set of environment variables passed to the process.
            </p>
          )}
        />
        <KeyValueEditor
          value={recordToIndexedKv(props.value.env || {})}
          onChange={(v) => props.onChange({ ...props.value, env: recordFromIndexedKv(v) })}
        />
      </FormItem>
    </div>
  );
}

export default PulsarStandaloneConfigInput;
