import React, { useState } from 'react';
import s from './CreateRemotePulsarConnectionButton.module.css'
import * as Modals from '../../../Modals/Modals';
import RemotePulsarConnectionEditor from '../RemotePulsarConnectionElement/RemotePulsarConnectionEditor/RemotePulsarConnectionEditor';
import Button from '../../../../ui/Button/Button';
import { v4 as uuid } from 'uuid';
import { CreateRemotePulsarConnection, RemotePulsarConnection } from '../../../../../main/api/remote-pulsar-connections/types';
import { genRandomName } from '../ConnectionMetadataEditor/gen-random-name';
import { apiChannel } from '../../../../../main/channels';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import addIcon from './add.svg';

export type CreateRemotePulsarConnectionButtonProps = {};

const CreateRemotePulsarConnectionButton: React.FC<CreateRemotePulsarConnectionButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <SmallButton
      type='primary'
      text='Add Connection'
      svgIcon={addIcon}
      onClick={() => {
        modals.push({
          id: 'create-remote-pulsar-connection',
          title: 'Add Connection',
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
  onCreate: (v: RemotePulsarConnection) => void,
  onCancel: () => void
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
      pulsarBrokerUrl: 'pulsar://localhost:6650',
      pulsarWebUrl: 'http://localhost:8080'
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12rem' }}>
          <Button
            type='regular'
            text='Cancel'
            onClick={props.onCancel}
          />
          <Button
            type='primary'
            text='Create'
            disabled={connection.metadata.name.length === 0 || connection.config.pulsarBrokerUrl.length === 0 || connection.config.pulsarWebUrl.length === 0}
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
