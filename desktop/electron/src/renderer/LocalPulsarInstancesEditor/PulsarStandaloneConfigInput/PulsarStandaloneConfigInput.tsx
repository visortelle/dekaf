import React from 'react';
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
          <H2>{props.value.pulsarVersion}</H2>
          <PulsarDistributionPickerButton
            onSelectVersion={(v) => props.onChange({ ...props.value, pulsarVersion: v })}
            buttonText='Select Another Version'
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel
          content="Wipe Data Before Each Launch"
          help={(
            <>
              <p>
                Remove all Pulsar instance resources and messages before the next instance launch.
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
          height='200rem'
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
          height='200rem'
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
