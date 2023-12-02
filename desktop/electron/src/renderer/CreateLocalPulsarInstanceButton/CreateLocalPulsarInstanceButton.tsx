import React, { useState } from 'react';
import s from './CreateLocalPulsarInstanceButton.module.css'
import * as Modals from '../app/Modals/Modals';
import SmallButton from '../ui/SmallButton/SmallButton';
import LocalPulsarInstanceEditor from '../LocalPulsarInstancesEditor/LocalPulsarInstanceEditor';
import { LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import Button from '../ui/Button/Button';

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
              onCreate={(v) => console.log('vvv', v)}
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
  const [localPulsarInstance, setLocalPulsarInstance] = useState<LocalPulsarInstance>({
    type: "LocalPulsarInstance",
    name: '',
    color: undefined,
    config: {
      type: "PulsarStandaloneConfig",
      env: {},
      functionsWorkerConfContent: '',
      webServicePort: 8080,
      numBookies: 1,
      brokerServicePort: 6650,
      bookkeeperPort: 3181,
      streamStoragePort: 4181,
      pulsarVersion: '3.11.1',
      standaloneConfContent: '',
      wipeData: undefined
    }
  });

  return (
    <div style={{ padding: '36rem 24rem', overflow: 'auto', maxHeight: 'inherit', display: 'flex', flexDirection: 'column', gap: '12rem' }}>
      <LocalPulsarInstanceEditor
        value={localPulsarInstance}
        onChange={setLocalPulsarInstance}
      />

      <div style={{ marginLeft: 'auto' }}>
        <Button
          type='primary'
          text='Create'
          onClick={() => {
            props.onCreate(localPulsarInstance);
          }}
        />
      </div>
    </div>
  );
};

export default CreateLocalPulsarInstanceButton;
