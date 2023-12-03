import React, { useEffect, useState } from 'react';
import s from './LocalPulsarInstanceElement.module.css'
import { LocalPulsarInstance } from '../../../main/api/local-pulsar-instances/types';
import SmallButton from '../../ui/SmallButton/SmallButton';
import { GetActiveProcesses, SpawnProcess } from '../../../main/api/processes/type';
import { v4 as uuid } from 'uuid';
import { apiChannel, logsChannel } from '../../../main/channels';
import ProcessLogsViewButton from '../../ui/LogsView/ProcessLogsViewButton/ProcessLogsViewButton';

export type LocalPulsarInstanceElementProps = {
  pulsarInstance: LocalPulsarInstance
};

const LocalPulsarInstanceElement: React.FC<LocalPulsarInstanceElementProps> = (props) => {
  const [pulsarProcessId, setPulsarProcessId] = useState<string | undefined>(undefined);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ActiveProcessesUpdated" || arg.type === "GetActiveProcessesResult") {
        const [maybeProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "pulsar-standalone" && process.type.instanceId === props.pulsarInstance.id) || [];

        setPulsarProcessId(maybeProcessId)
      }
    });

    const req: GetActiveProcesses = { type: "GetActiveProcesses" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  return (
    <div className={s.LocalPulsarInstanceElement}>

      {pulsarProcessId && (
        <ProcessLogsViewButton
          sources={[
            { name: 'pulsar-standalone', processId: pulsarProcessId },
          ]}
        />
      )}

      {JSON.stringify(props.pulsarInstance.id, null, 4)}
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
