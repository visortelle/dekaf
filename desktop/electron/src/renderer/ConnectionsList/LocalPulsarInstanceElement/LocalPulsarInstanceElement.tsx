import React, { useEffect, useState } from 'react';
import s from './LocalPulsarInstanceElement.module.css'
import { LocalPulsarInstance } from '../../../main/api/local-pulsar-instances/types';
import SmallButton from '../../ui/SmallButton/SmallButton';
import { GetActiveProcesses, SpawnProcess } from '../../../main/api/processes/types';
import { v4 as uuid } from 'uuid';
import { apiChannel, logsChannel } from '../../../main/channels';
import ProcessLogsViewButton from '../../ui/LogsView/ProcessLogsViewButton/ProcessLogsViewButton';
import ProcessStatusIndicator from './ProcessStatusIndicator/ProcessStatusIndicator';
import { LogSource } from '../../ui/LogsView/ProcessLogsView/ProcessLogsView';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../app/local-storage';

export type LocalPulsarInstanceElementProps = {
  pulsarInstance: LocalPulsarInstance
};

const LocalPulsarInstanceElement: React.FC<LocalPulsarInstanceElementProps> = (props) => {
  const [pulsarProcessId, setPulsarProcessId] = useState<string | undefined>(undefined);
  const [dekafProcessId, setDekafProcessId] = useState<string | undefined>(undefined);
  const [dekafLicenseId] = useLocalStorage<string>(localStorageKeys.dekafLicenseId, { defaultValue: '' });
  const [dekafLicenseToken] = useLocalStorage<string>(localStorageKeys.dekafLicenseToken, { defaultValue: '' });

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ActiveProcessesUpdated" || arg.type === "GetActiveProcessesResult") {
        const [maybePulsarProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "pulsar-standalone" && process.type.instanceConfig.id === props.pulsarInstance.id) || [];
        setPulsarProcessId(maybePulsarProcessId);

        const [maybeDekafProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "dekaf" && process.type.connection.type === "local-pulsar-instance" && process.type.connection.instanceId === props.pulsarInstance.id) || [];
        setDekafProcessId(maybeDekafProcessId);
      }
    });

    const req: GetActiveProcesses = { type: "GetActiveProcesses" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, []);

  let logSources: LogSource[] = [];
  if (pulsarProcessId !== undefined) {
    logSources = logSources.concat([{ name: 'pulsar broker', processId: pulsarProcessId }]);
  }
  if (dekafProcessId !== undefined) {
    logSources = logSources.concat([{ name: 'dekaf', processId: dekafProcessId }]);
  }

  return (
    <div className={s.LocalPulsarInstanceElement}>
      <ProcessLogsViewButton
        sources={logSources}
      />
      <ProcessStatusIndicator processId={pulsarProcessId} />
      <ProcessStatusIndicator processId={dekafProcessId} />

      {JSON.stringify(props.pulsarInstance.id, null, 4)}&nbsp;
      <SmallButton
        type='primary'
        text='Start and Connect'
        onClick={() => {
          const pulsarReq: SpawnProcess = {
            type: "SpawnProcess",
            process: {
              type: "pulsar-standalone",
              instanceId: props.pulsarInstance.id,
            },
            processId: uuid()
          };

          window.electron.ipcRenderer.sendMessage(apiChannel, pulsarReq);

          const dekafReq: SpawnProcess = {
            type: "SpawnProcess",
            process: {
              type: "dekaf",
              connection: {
                type: "local-pulsar-instance",
                instanceId: props.pulsarInstance.id,
                dekafLicenseId,
                dekafLicenseToken
              }
            },
            processId: uuid()
          };

          window.electron.ipcRenderer.sendMessage(apiChannel, dekafReq);
        }}
      />
    </div>
  );
}

export default LocalPulsarInstanceElement;
