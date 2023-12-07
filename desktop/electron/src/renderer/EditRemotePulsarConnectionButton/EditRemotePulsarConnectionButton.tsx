import React, { useEffect, useState } from 'react';
import s from './EditRemotePulsarConnectionButton.module.css'
import * as Modals from '../app/Modals/Modals';
import * as Notifications from '../app/Notifications/Notifications';
import RemotePulsarConnectionEditor from '../RemotePulsarConnectionEditor/RemotePulsarConnectionEditor';
import Button from '../ui/Button/Button';
import { ListRemotePulsarConnections, RemotePulsarConnection, UpdateRemotePulsarConnection } from '../../main/api/remote-pulsar-connections/types';
import { apiChannel } from '../../main/channels';
import SmallButton from '../ui/SmallButton/SmallButton';

export type EditRemotePulsarConnectionButtonProps = {
  connectionId: string,
  disabled?: boolean
};

const EditRemotePulsarConnectionButton: React.FC<EditRemotePulsarConnectionButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <SmallButton
      type='primary'
      text='Configure'
      onClick={() => {
        modals.push({
          id: 'edit-remote-pulsar-connection',
          title: 'Edit Remote Connection',
          content: (
            <EditRemotePulsarConnectionForm
              connectionId={props.connectionId}
              onSave={() => {
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

type EditRemotePulsarConnectionFormProps = {
  connectionId: string,
  onSave: (v: RemotePulsarConnection) => void
};


const EditRemotePulsarConnectionForm: React.FC<EditRemotePulsarConnectionFormProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const [remotePulsarConnection, setRemotePulsarConnection] = useState<RemotePulsarConnection | undefined>(undefined);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListRemotePulsarConnectionsResult") {
        const connection = arg.configs.find(c => c.metadata.id === props.connectionId);

        if (!connection) {
          notifyError(`Unable to find remote Pulsar connection: ${props.connectionId}`);
          return;
        }

        setRemotePulsarConnection(connection);
      }
    });

    const req: ListRemotePulsarConnections = { type: "ListRemotePulsarConnections" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  if (remotePulsarConnection === undefined) {
    return <></>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', maxHeight: 'inherit' }}>
      <div style={{ overflowX: 'hidden', overflowY: 'auto', flex: '1 1 0%' }}>
        <RemotePulsarConnectionEditor
          value={remotePulsarConnection}
          onChange={setRemotePulsarConnection}
        />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '8rem 24rem', background: '#fff' }}>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type='primary'
            text='Save'
            onClick={() => {
              const req: UpdateRemotePulsarConnection = {
                type: "UpdateRemotePulsarConnection",
                config: remotePulsarConnection
              };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);
              props.onSave(remotePulsarConnection);
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default EditRemotePulsarConnectionButton;
