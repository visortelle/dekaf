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
import { isEqual } from 'lodash';

export type CreateLocalPulsarInstanceButtonProps = {};

const CreateLocalPulsarInstanceButton: React.FC<CreateLocalPulsarInstanceButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <Button
      type='primary'
      text='Create Local Pulsar Instance'
      onClick={() => {
        modals.push({
          id: 'add-modal-pulsar-instance',
          title: 'Create Local Pulsar Instance',
          content: (
            <CreateLocalPulsarInstanceForm
              onCreate={() => {
                modals.pop();
              }}
            />
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

type CreateLocalPulsarInstanceFormProps = {
  onCreate: (v: LocalPulsarInstance) => void
};


const CreateLocalPulsarInstanceForm: React.FC<CreateLocalPulsarInstanceFormProps> = (props) => {
  const [installedPulsarVersions, setInstalledPulsarVersions] = useState<string[]>([]);
  const modals = Modals.useContext();

  const [localPulsarInstance, setLocalPulsarInstance] = useState<LocalPulsarInstance | undefined>(undefined);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListPulsarDistributionsResult" && arg.isInstalledOnly) {
        if (isEqual(arg.versions, installedPulsarVersions)) {
          return;
        }

        setInstalledPulsarVersions(arg.versions || []);
      }
    });

    const req: ListPulsarDistributions = { type: "ListPulsarDistributions", isInstalledOnly: true };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  useEffect(() => {
    if (localPulsarInstance !== undefined || installedPulsarVersions.length === 0) {
      return;
    }

    const newestInstalledPulsarVersion = (installedPulsarVersions || []).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))[0];

    const newLocalPulsarInstance: LocalPulsarInstance = {
      type: "LocalPulsarInstance",
      metadata: {
        type: "ConnectionMetadata",
        id: uuid(),
        name: `New Instance ${new Date().toISOString()}`,
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
        pulsarVersion: newestInstalledPulsarVersion,
        wipeData: undefined,
      },
    }

    setLocalPulsarInstance(newLocalPulsarInstance);

    const req: ListPulsarDistributions = { type: "ListPulsarDistributions", isInstalledOnly: true };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, [installedPulsarVersions])

  useEffect(() => {
    if (installedPulsarVersions.length === 0) {
      modals.push({
        id: 'create-local-pulsar-instance-button-select-pulsar-distribution',
        title: 'Select Pulsar Version',
        content: (
          <div style={{ maxHeight: 'inherit', overflow: 'auto' }}>
            <PulsarDistributionPicker
              onSelectVersion={(version) => {
                modals.pop();
                setInstalledPulsarVersions([version]);
              }}
            />
          </div>
        ),
        styleMode: 'no-content-padding',
        onClose: modals.pop
      });
    }
  }, [installedPulsarVersions]);

  if (localPulsarInstance === undefined) {
    return <>Loading...</>;
  }

  return (
    <div style={{ overflow: 'hidden', maxHeight: 'inherit', display: 'flex', flexDirection: 'column', gap: '12rem', position: 'relative' }}>
      <div style={{ overflow: 'auto', flex: '1', padding: '36rem 24rem' }}>
        <LocalPulsarInstanceEditor
          value={localPulsarInstance}
          onChange={setLocalPulsarInstance}
        />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '8rem 24rem', background: '#fff' }}>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type='primary'
            text='Create Pulsar Instance'
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
