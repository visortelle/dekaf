import React, { useEffect, useState } from 'react';
import s from './LocalPulsarInstanceElement.module.css'
import { LocalPulsarInstance, UpdateLocalPulsarInstance } from '../../../main/api/local-pulsar-instances/types';
import SmallButton from '../../ui/SmallButton/SmallButton';
import { GetActiveProcesses, KillProcess, ProcessStatus, SpawnProcess } from '../../../main/api/processes/types';
import { v4 as uuid } from 'uuid';
import { apiChannel, logsChannel } from '../../../main/channels';
import ProcessLogsViewButton from '../../ui/LogsView/ProcessLogsViewButton/ProcessLogsViewButton';
import ProcessStatusIndicator from './ProcessStatusIndicator/ProcessStatusIndicator';
import { LogSource } from '../../ui/LogsView/ProcessLogsView/ProcessLogsView';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../app/local-storage';
import NoData from '../../ui/NoData/NoData';
import EditLocalPulsarInstanceButton from '../../EditLocalPulsarInstanceButton/EditLocalPulsarInstanceButton';
import DeleteLocalPulsarInstanceButton from '../../DeleteLocalPulsarInstanceButton/DeleteLocalPulsarInstanceButton';
import { H3 } from '../../ui/H/H';
import * as I18n from '../../app/I18n/I18n';

export type LocalPulsarInstanceElementProps = {
  pulsarInstance: LocalPulsarInstance
};

const LocalPulsarInstanceElement: React.FC<LocalPulsarInstanceElementProps> = (props) => {
  const i18n = I18n.useContext();
  const [pulsarProcessId, setPulsarProcessId] = useState<string | undefined>(undefined);
  const [pulsarProcessStatus, setPulsarProcessStatus] = useState<ProcessStatus | undefined>(undefined);
  const [dekafProcessId, setDekafProcessId] = useState<string | undefined>(undefined);
  const [dekafProcessStatus, setDekafProcessStatus] = useState<ProcessStatus | undefined>(undefined);
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

  const isRunning =
    pulsarProcessStatus === 'starting' ||
    pulsarProcessStatus === 'alive' ||
    pulsarProcessStatus === 'ready' ||
    dekafProcessStatus === "starting" ||
    dekafProcessStatus === "alive" ||
    dekafProcessStatus === "ready";
  const isStopping = pulsarProcessStatus === 'stopping' || dekafProcessStatus === 'stopping';

  const renderStatus = (status: ProcessStatus | undefined): React.ReactNode => {
    switch (status) {
      case undefined: return <NoData />;
      case "unknown": return <NoData />;
      case "starting": return "starting...";
      case "alive": return "starting...";
      case "stopping": return "stopping...";
      default: return status;
    }
  }

  return (
    <div className={s.LocalPulsarInstanceElement}>
      <H3>{props.pulsarInstance.name}</H3>

      <div><strong>Last used:</strong>&nbsp;{i18n.formatDateTime(new Date(props.pulsarInstance.lastUsedAt))}</div>

      <div><strong>Pulsar version:</strong>&nbsp;{props.pulsarInstance.config.pulsarVersion}</div>
      <div style={{ display: 'flex', gap: '8rem', alignItems: 'center' }}>
        <ProcessStatusIndicator processId={pulsarProcessId} onStatusChange={setPulsarProcessStatus} />
        <strong>Pulsar status:&nbsp;</strong>{renderStatus(pulsarProcessStatus)}
      </div>
      <div style={{ display: 'flex', gap: '8rem', alignItems: 'center' }}>
        <ProcessStatusIndicator processId={dekafProcessId} onStatusChange={setDekafProcessStatus} />
        <strong>Dekaf status:&nbsp;</strong>{renderStatus(dekafProcessStatus)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
        {!isRunning && <SmallButton
          type='primary'
          text='Start'
          disabled={isStopping}
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

            const updateReq: UpdateLocalPulsarInstance = {
              type: "UpdateLocalPulsarInstance",
              config: {
                ...props.pulsarInstance,
                lastUsedAt: Date.now()
              }
            }

            window.electron.ipcRenderer.sendMessage(apiChannel, updateReq);
          }}
        />}

        {isRunning && <SmallButton
          type='regular'
          text='Stop'
          disabled={(pulsarProcessId === undefined && setDekafProcessId === undefined) || isStopping}
          onClick={() => {
            [pulsarProcessId, dekafProcessId].forEach(processId => {
              if (processId === undefined) {
                return;
              }

              const req: KillProcess = { type: "KillProcess", processId };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);
            });
          }}
        />}

        <ProcessLogsViewButton sources={logSources} />

        <EditLocalPulsarInstanceButton instanceId={props.pulsarInstance.id} disabled={isRunning} />
        <DeleteLocalPulsarInstanceButton instanceId={props.pulsarInstance.id} instanceName={props.pulsarInstance.name} disabled={isRunning} />
      </div>
    </div>
  );
}

export default LocalPulsarInstanceElement;
