import React, { useEffect, useMemo, useState } from 'react';
import s from './CreateRemotePulsarConnectionButton.module.css'
import * as Modals from '../app/Modals/Modals';
import RemotePulsarConnectionEditor from '../RemotePulsarConnectionEditor/RemotePulsarConnectionEditor';
import { CreateLocalPulsarInstance, LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import Button from '../ui/Button/Button';
import { v4 as uuid } from 'uuid';
import { apiChannel } from '../../main/channels';
import { ListPulsarDistributions } from '../../main/api/local-pulsar-distributions/types';
import PulsarDistributionPicker from '../LocalPulsarInstanceEditor/PulsarDistributionPickerButton/PulsarDistributionPicker/PulsarDistributionPicker';
import { isEqual } from 'lodash';
import { RemotePulsarConnection } from '../../main/api/remote-pulsar-connections/types';

export type CreateRemotePulsarConnectionButtonProps = {};

const CreateRemotePulsarConnectionButton: React.FC<CreateRemotePulsarConnectionButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <Button
      type='primary'
      text='Create Remote Pulsar Connection'
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
  const [connection, setConnection] = useState<RemotePulsarConnection>({
    type: "RemotePulsarConnection",
    metadata: {
      type: "ConnectionMetadata",
      id: uuid(),
      lastUsedAt: Date.now(),
      name: `New connection ${new Date().toISOString()}`,
      color: undefined
    },
    config: {
      type: "RemotePulsarConnectionConfig"
    }
  });

  return (
    <div style={{ overflow: 'hidden', maxHeight: 'inherit', display: 'flex', flexDirection: 'column', gap: '12rem', position: 'relative' }}>
      <div style={{ overflow: 'auto', flex: '1', padding: '36rem 24rem' }}>
        <RemotePulsarConnectionEditor
          value={connection}
          onChange={(v) => console.log('VVV', v) || setConnection(v)}
        />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '8rem 24rem', background: '#fff' }}>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type='primary'
            text='Create Remote Pulsar Connection'
            onClick={() => {
              // const req: CreateLocalPulsarInstance = {
              //   type: "CreateLocalPulsarInstance",
              //   config: connection
              // };
              // window.electron.ipcRenderer.sendMessage(apiChannel, req);

              // props.onCreate(connection);
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default CreateRemotePulsarConnectionButton;
