import React, { useEffect, useMemo, useState } from 'react';
import s from './CreateLocalPulsarInstanceButton.module.css'
import * as Modals from '../app/Modals/Modals';
import LocalPulsarInstanceEditor from '../LocalPulsarInstanceEditor/LocalPulsarInstanceEditor';
import { CreateLocalPulsarInstance, LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import Button from '../ui/Button/Button';
import { v4 as uuid } from 'uuid';
import { apiChannel } from '../../main/channels';
import { ListPulsarDistributions } from '../../main/api/local-pulsar-distributions/types';
import PulsarDistributionPicker from '../LocalPulsarInstanceEditor/PulsarDistributionPickerButton/PulsarDistributionPicker/PulsarDistributionPicker';
import { genRandomName } from '../ConnectionMetadataEditor/gen-random-name';

export type CreateLocalPulsarInstanceButtonProps = {};

const CreateLocalPulsarInstanceButton: React.FC<CreateLocalPulsarInstanceButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <Button
      type='primary'
      text='Create Local Pulsar Instance'
      onClick={() => {
        modals.push({
          id: 'create-local-pulsar-instance',
          title: 'Create Local Pulsar Instance',
          content: (
            <CreateLocalPulsarInstanceForm
              onCreate={modals.pop}
              onCancel={modals.pop}
            />
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

type CreateLocalPulsarInstanceFormProps = {
  onCreate: (v: LocalPulsarInstance) => void,
  onCancel: () => void
};


const CreateLocalPulsarInstanceForm: React.FC<CreateLocalPulsarInstanceFormProps> = (props) => {
  const modals = Modals.useContext();

  const [pulsarVersion, setPulsarVersion] = useState<string | undefined>(undefined);
  const [localPulsarInstance, setLocalPulsarInstance] = useState<LocalPulsarInstance | undefined>(undefined);

  useEffect(() => {
    if (localPulsarInstance !== undefined || pulsarVersion === undefined) {
      return;
    }

    const newLocalPulsarInstance: LocalPulsarInstance = {
      type: "LocalPulsarInstance",
      metadata: {
        type: "ConnectionMetadata",
        id: uuid(),
        name: genRandomName(),
        color: undefined,
        lastUsedAt: Date.now()
      },
      config: {
        type: "PulsarStandaloneConfig",
        env: {},
        standaloneConfContent: undefined,
        functionsWorkerConfContent: undefined,
        webServicePort: 8080,
        numBookies: 1,
        brokerServicePort: 6650,
        bookkeeperPort: 3181,
        streamStoragePort: 4181,
        pulsarVersion,
        wipeData: undefined,
      },
    }

    setLocalPulsarInstance(newLocalPulsarInstance);

    const req: ListPulsarDistributions = { type: "ListPulsarDistributions", isInstalledOnly: true };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, [pulsarVersion])

  useEffect(() => {
    if (pulsarVersion === undefined) {
      modals.push({
        id: 'create-local-pulsar-instance-button-select-pulsar-distribution',
        title: 'Select Pulsar Version',
        content: (
          <div style={{ overflow: 'auto' }}>
            <PulsarDistributionPicker
              onSelectVersion={(version) => {
                modals.pop();
                setPulsarVersion(version);
              }}
            />
          </div>
        ),
        styleMode: 'no-content-padding',
        onClose: modals.pop
      });
    }
  }, [pulsarVersion]);

  if (localPulsarInstance === undefined) {
    return <>Loading...</>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem', position: 'relative', maxHeight: 'inherit' }}>
      <div style={{ overflow: 'auto', flex: '1' }}>
        <LocalPulsarInstanceEditor
          value={localPulsarInstance}
          onChange={setLocalPulsarInstance}
        />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '8rem 24rem', background: '#fff' }}>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12rem' }}>
          <Button
            type='regular'
            text='Cancel'
            onClick={props.onCancel}
          />
          <Button
            type='primary'
            text='Create'
            disabled={localPulsarInstance.metadata.name.length === 0 || localPulsarInstance.config.pulsarVersion === undefined}
            onClick={() => {
              const req: CreateLocalPulsarInstance = {
                type: "CreateLocalPulsarInstance",
                config: localPulsarInstance
              };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);

              props.onCreate(localPulsarInstance);
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default CreateLocalPulsarInstanceButton;
