import React, { useEffect, useState } from 'react';
import s from './EditRemotePulsarConnectionButton.module.css'
import * as Modals from '../../../../Modals/Modals';
import * as Notifications from '../../../../Notifications/Notifications';
import RemotePulsarConnectionEditor from '../RemotePulsarConnectionEditor/RemotePulsarConnectionEditor';
import Button from '../../../../../ui/Button/Button';
import { ListRemotePulsarConnections, RemotePulsarConnection, UpdateRemotePulsarConnection } from '../../../../../../main/api/remote-pulsar-connections/types';
import { apiChannel } from '../../../../../../main/channels';
import SmallButton from '../../../../../ui/SmallButton/SmallButton';

export type EditRemotePulsarConnectionButtonProps = {
  connectionId: string,
  disabled?: boolean
};

const EditRemotePulsarConnectionButton: React.FC<EditRemotePulsarConnectionButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <SmallButton
      type='regular'
      text='Configure'
      onClick={() => {
        modals.push({
          id: 'edit-remote-pulsar-connection',
          title: 'Edit Remote Connection',
          content: (
            <EditRemotePulsarConnectionForm
              connectionId={props.connectionId}
              onSave={modals.pop}
              onCancel={modals.pop}
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
  onSave: (v: RemotePulsarConnection) => void,
  onCancel: () => void
};


const EditRemotePulsarConnectionForm: React.FC<EditRemotePulsarConnectionFormProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const [connection, setConnection] = useState<RemotePulsarConnection | undefined>(undefined);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListRemotePulsarConnectionsResult") {
        const connection = arg.configs.find(c => c.metadata.id === props.connectionId);

        if (!connection) {
          notifyError(`Unable to find remote Pulsar connection: ${props.connectionId}`);
          return;
        }

        setConnection(connection);
      }
    });

    const req: ListRemotePulsarConnections = { type: "ListRemotePulsarConnections" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  if (connection === undefined) {
    return <></>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', maxHeight: 'inherit' }}>
      <div style={{ overflowX: 'hidden', overflowY: 'auto', flex: '1 1 0%' }}>
        <RemotePulsarConnectionEditor
          value={connection}
          onChange={setConnection}
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
            text='Save'
            disabled={connection.metadata.name.length === 0 || connection.config.pulsarBrokerUrl.length === 0 || connection.config.pulsarWebUrl.length === 0}
            onClick={() => {
              const req: UpdateRemotePulsarConnection = {
                type: "UpdateRemotePulsarConnection",
                config: connection
              };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);
              props.onSave(connection);
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default EditRemotePulsarConnectionButton;
