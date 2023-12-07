import React, { useState } from 'react';
import s from './CreateRemotePulsarConnectionButton.module.css'
import * as Modals from '../app/Modals/Modals';
import RemotePulsarConnectionEditor from '../RemotePulsarConnectionEditor/RemotePulsarConnectionEditor';
import Button from '../ui/Button/Button';
import { v4 as uuid } from 'uuid';
import { CreateRemotePulsarConnection, RemotePulsarConnection } from '../../main/api/remote-pulsar-connections/types';
import { genRandomName } from '../ConnectionMetadataEditor/gen-random-name';
import { apiChannel } from '../../main/channels';

export type CreateRemotePulsarConnectionButtonProps = {};

const CreateRemotePulsarConnectionButton: React.FC<CreateRemotePulsarConnectionButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <Button
      type='primary'
      text='Create Remote Connection'
      onClick={() => {
        modals.push({
          id: 'add-modal-pulsar-instance',
          title: 'Create Remote Connection',
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
  onCreate: (v: RemotePulsarConnection) => void
};


const CreateLocalPulsarInstanceForm: React.FC<CreateLocalPulsarInstanceFormProps> = (props) => {
  const [connection, setConnection] = useState<RemotePulsarConnection>({
    type: "RemotePulsarConnection",
    metadata: {
      type: "ConnectionMetadata",
      id: uuid(),
      lastUsedAt: Date.now(),
      name: genRandomName(),
      color: undefined
    },
    config: {
      type: "RemotePulsarConnectionConfig",
      pulsarBrokerUrl: '',
      pulsarWebUrl: ''
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', maxHeight: 'inherit' }}>
      <div style={{ overflowX: 'hidden', overflowY: 'auto', flex: '1 1 0%' }}>
        <RemotePulsarConnectionEditor
          value={connection}
          onChange={(v) => setConnection(v)}
        />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '8rem 24rem', background: '#fff' }}>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type='primary'
            text='Create Remote Connection'
            onClick={() => {
              const req: CreateRemotePulsarConnection = {
                type: "CreateRemotePulsarConnection",
                config: connection
              };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);
              props.onCreate(connection);
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default CreateRemotePulsarConnectionButton;
