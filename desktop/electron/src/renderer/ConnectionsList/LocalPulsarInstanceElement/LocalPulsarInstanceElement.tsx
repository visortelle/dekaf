import React, { useEffect, useState } from 'react';
import s from './LocalPulsarInstanceElement.module.css'
import { LocalPulsarInstance } from '../../../main/api/local-pulsar-instances/types';
import SmallButton from '../../ui/SmallButton/SmallButton';
import { GetActiveProcesses, SpawnProcess } from '../../../main/api/processes/type';
import { v4 as uuid } from 'uuid';
import { apiChannel, logsChannel } from '../../../main/channels';
import ProcessLogsView from '../../ui/LogsView/ProcessLogsView/ProcessLogsView';

export type LocalPulsarInstanceElementProps = {
  pulsarInstance: LocalPulsarInstance
};

const LocalPulsarInstanceElement: React.FC<LocalPulsarInstanceElementProps> = (props) => {
  const [pulsarProcessId, setPulsarProcessId] = useState<string | undefined>(undefined);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ActiveProcessesUpdated" || arg.type === "GetActiveProcessesResult") {
        console.log('hmmmmmmmmmmmm', arg);
        const [maybeProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "pulsar-standalone" && process.type.instanceId === props.pulsarInstance.id) || [];

        setPulsarProcessId(maybeProcessId)
      }
    });

    window.electron.ipcRenderer.on(logsChannel, (arg) => {
      if (arg.type === "ProcessLogEntryReceived") {
        console.log(arg.text);
      }
    });

    const req: GetActiveProcesses = { type: "GetActiveProcesses" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  console.log('pulsar process', pulsarProcessId);

  return (
    <div className={s.LocalPulsarInstanceElement}>
      {pulsarProcessId && (
        <ProcessLogsView processId={pulsarProcessId} />
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
