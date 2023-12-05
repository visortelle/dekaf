import React, { useEffect, useState } from 'react';
import s from './CreateLocalPulsarInstanceButton.module.css'
import * as Modals from '../app/Modals/Modals';
import LocalPulsarInstanceEditor from '../LocalPulsarInstanceEditor/LocalPulsarInstanceEditor';
import { CreateLocalPulsarInstance, LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import Button from '../ui/Button/Button';
import { v4 as uuid } from 'uuid';
import { apiChannel } from '../../main/channels';
import { ListPulsarDistributions } from '../../main/api/local-pulsar-distributions/types';
import PulsarDistributionPicker from '../LocalPulsarInstanceEditor/PulsarDistributionPickerButton/PulsarDistributionPicker/PulsarDistributionPicker';
import { cloneDeep } from 'lodash';

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
  const [installedPulsarVersions, setInstalledPulsarVersions] = useState<string[] | undefined>();
  const latestInstalledPulsarVersion: string | undefined = (installedPulsarVersions || []).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))[0];
  const modals = Modals.useContext();

  const [localPulsarInstance, setLocalPulsarInstance] = useState<LocalPulsarInstance>({
    type: "LocalPulsarInstance",
    id: uuid(),
    name: `New Instance ${new Date().toISOString()}`,
    color: undefined,
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
      pulsarVersion: latestInstalledPulsarVersion,
      wipeData: undefined,
    },
    lastUsedAt: Date.now()
  });

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListPulsarDistributionsResult" && arg.isInstalledOnly) {
        setInstalledPulsarVersions(arg.versions || []);
      }
    });

    const req: ListPulsarDistributions = { type: "ListPulsarDistributions", isInstalledOnly: true };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  useEffect(() => {
    if (Array.isArray(installedPulsarVersions) && installedPulsarVersions.length === 0) {
      modals.push({
        id: 'select-pulsar-distribution',
        title: 'Select Pulsar Version',
        content: (
          <div style={{ maxHeight: 'inherit', overflow: 'auto' }}>
            <PulsarDistributionPicker
              onSelectVersion={(version) => {
                modals.pop();

                const newLocalPulsarInstance: LocalPulsarInstance = cloneDeep(localPulsarInstance);
                newLocalPulsarInstance.config.pulsarVersion = version;

                setLocalPulsarInstance(newLocalPulsarInstance);

                const req: ListPulsarDistributions = { type: "ListPulsarDistributions", isInstalledOnly: true };
                window.electron.ipcRenderer.sendMessage(apiChannel, req);
              }}
            />
          </div>
        ),
        styleMode: 'no-content-padding',
        onClose: modals.pop
      });
    }
  }, [installedPulsarVersions?.length]);

  if (installedPulsarVersions === undefined || installedPulsarVersions.length === 0) {
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
            disabled={localPulsarInstance.name.length === 0 || localPulsarInstance.config.pulsarVersion === undefined}
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
