import React, { useEffect } from 'react';
import s from './LocalPulsarInstanceElement.module.css'
import { LocalPulsarInstance } from '../../../main/api/local-pulsar-instances/types';
import SmallButton from '../../ui/SmallButton/SmallButton';
import { SpawnProcess } from '../../../main/api/processes/type';
import { v4 as uuid } from 'uuid';
import { apiChannel } from '../../../main/channels';

export type LocalPulsarInstanceElementProps = {
  pulsarInstance: LocalPulsarInstance
};

const LocalPulsarInstanceElement: React.FC<LocalPulsarInstanceElementProps> = (props) => {
  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ProcessLogEntryReceived") {
        console.log(arg.text);
      }
    });
  }, []);

  return (
    <div className={s.LocalPulsarInstanceElement}>
      {JSON.stringify(props.pulsarInstance, null, 4)}
      <SmallButton
        type='primary'
        text='Start and Connect'
        onClick={() => {
          const req: SpawnProcess = {
            type: "SpawnProcess",
            process: {
              type: "pulsar-standalone",
              instanceId: props.pulsarInstance.id,
            },
            processId: uuid()
          };

          window.electron.ipcRenderer.sendMessage(apiChannel, req);
        }}

      />
    </div>
  );
}

export default LocalPulsarInstanceElement;
