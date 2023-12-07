import React, { useEffect, useState } from 'react';
import s from './EditLocalPulsarInstanceButton.module.css'
import * as Modals from '../app/Modals/Modals';
import * as Notifications from '../app/Notifications/Notifications';
import LocalPulsarInstanceEditor from '../LocalPulsarInstanceEditor/LocalPulsarInstanceEditor';
import { apiChannel } from '../../main/channels';
import { ListLocalPulsarInstances, LocalPulsarInstance, UpdateLocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import SmallButton from '../ui/SmallButton/SmallButton';
import Button from '../ui/Button/Button';

export type EditLocalPulsarInstanceButtonProps = {
  instanceId: string,
  disabled?: boolean
};

const EditLocalPulsarInstanceButton: React.FC<EditLocalPulsarInstanceButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <SmallButton
      type='regular'
      text='Configure'
      disabled={props.disabled}
      onClick={() => {
        modals.push({
          id: 'edit-modal-pulsar-instance',
          title: 'Configure Local Pulsar Instance',
          content: (
            <EditLocalPulsarInstanceForm
              instanceId={props.instanceId}
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

type EditLocalPulsarInstanceFormProps = {
  instanceId: string,
  onSave: (v: LocalPulsarInstance) => void,
  onCancel: () => void
};

const EditLocalPulsarInstanceForm: React.FC<EditLocalPulsarInstanceFormProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const [localPulsarInstance, setLocalPulsarInstance] = useState<LocalPulsarInstance | undefined>(undefined);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListLocalPulsarInstancesResult") {
        const instance = arg.configs.find(c => c.metadata.id === props.instanceId);

        if (!instance) {
          notifyError(`Unable to find local Pulsar instance: ${props.instanceId}`);
          return;
        }

        setLocalPulsarInstance(instance);
      }
    });

    const req: ListLocalPulsarInstances = { type: "ListLocalPulsarInstances" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  if (localPulsarInstance === undefined) {
    return <></>;
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
            text='Save'
            disabled={localPulsarInstance.metadata.name.length === 0}
            onClick={() => {
              const req: UpdateLocalPulsarInstance = {
                type: "UpdateLocalPulsarInstance",
                config: localPulsarInstance
              };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);

              props.onSave(localPulsarInstance);
            }}
          />
        </div>

      </div>
    </div>
  );
};



export default EditLocalPulsarInstanceButton;
