import React, { useEffect, useState } from 'react';
import s from './RemotePulsarConnectionElement.module.css'
import { apiChannel } from '../../../main/channels';
import { RemotePulsarConnection, UpdateRemotePulsarConnection } from '../../../main/api/remote-pulsar-connections/types';
import { GetActiveProcesses, KillProcess, ProcessStatus, SpawnProcess } from '../../../main/api/processes/types';
import { localStorageKeys } from '../../app/local-storage';
import useLocalStorage from 'use-local-storage-state';
import NoData from '../../ui/NoData/NoData';
import { H3 } from '../../ui/H/H';
import * as I18n from '../../app/I18n/I18n';
import ProcessStatusIndicator from '../LocalPulsarInstanceElement/ProcessStatusIndicator/ProcessStatusIndicator';
import SmallButton from '../../ui/SmallButton/SmallButton';
import { v4 as uuid } from 'uuid';
import { LogSource } from '../../ui/LogsView/ProcessLogsView/ProcessLogsView';
import ProcessLogsViewButton from '../../ui/LogsView/ProcessLogsViewButton/ProcessLogsViewButton';

export type RemotePulsarConnectionElementProps = {
  remoteConnection: RemotePulsarConnection
};

const RemotePulsarConnectionElement: React.FC<RemotePulsarConnectionElementProps> = (props) => {
  const i18n = I18n.useContext();
  const [dekafProcessId, setDekafProcessId] = useState<string | undefined>(undefined);
  const [dekafProcessStatus, setDekafProcessStatus] = useState<ProcessStatus | undefined>(undefined);
  const [dekafLicenseId] = useLocalStorage<string>(localStorageKeys.dekafLicenseId, { defaultValue: '' });
  const [dekafLicenseToken] = useLocalStorage<string>(localStorageKeys.dekafLicenseToken, { defaultValue: '' });

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ActiveProcessesUpdated" || arg.type === "GetActiveProcessesResult") {
        const [maybeDekafProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "dekaf" && process.type.connection.type === "local-pulsar-instance" && process.type.connection.instanceId === props.remoteConnection.metadata.id) || [];
        setDekafProcessId(maybeDekafProcessId);
      }
    });

    const req: GetActiveProcesses = { type: "GetActiveProcesses" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, [props.remoteConnection]);

  let logSources: LogSource[] = [];
  if (dekafProcessId !== undefined) {
    logSources = logSources.concat([{ name: 'dekaf', processId: dekafProcessId }]);
  }

  const isRunning =
    dekafProcessStatus === "starting" ||
    dekafProcessStatus === "alive" ||
    dekafProcessStatus === "ready";
  const isStopping = dekafProcessStatus === 'stopping';

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
    <div className={s.RemotePulsarConnectionElement}>
      <H3>{props.remoteConnection.metadata.name}</H3>
      <div><strong>Last used:</strong>&nbsp;{i18n.formatDateTime(new Date(props.remoteConnection.metadata.lastUsedAt))}</div>

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
            const dekafReq: SpawnProcess = {
              type: "SpawnProcess",
              process: {
                type: "dekaf",
                connection: {
                  type: "remote-pulsar-connection",
                  connectionId: props.remoteConnection.metadata.id,
                  dekafLicenseId,
                  dekafLicenseToken
                }
              },
              processId: uuid()
            };

            window.electron.ipcRenderer.sendMessage(apiChannel, dekafReq);

            const updateReq: UpdateRemotePulsarConnection = {
              type: "UpdateRemotePulsarConnection",
              config: {
                ...props.remoteConnection,
                metadata: {
                  ...props.remoteConnection.metadata,
                  lastUsedAt: Date.now()
                }
              }
            }

            window.electron.ipcRenderer.sendMessage(apiChannel, updateReq);
          }}
        />}

        {isRunning && <SmallButton
          type='regular'
          text='Stop'
          disabled={(setDekafProcessId === undefined) || isStopping}
          onClick={() => {
            [dekafProcessId].forEach(processId => {
              if (processId === undefined) {
                return;
              }

              const req: KillProcess = { type: "KillProcess", processId };
              window.electron.ipcRenderer.sendMessage(apiChannel, req);
            });
          }}
        />}

        <ProcessLogsViewButton
          sources={logSources}
          disabled={dekafProcessStatus === undefined}
        />

        {/* <EditLocalPulsarInstanceButton instanceId={props.pulsarInstance.metadata.id} disabled={isRunning} /> */}
        {/* <DeleteLocalPulsarInstanceButton instanceId={props.pulsarInstance.metadata.id} instanceName={props.pulsarInstance.metadata.name} disabled={isRunning} /> */}
      </div>
    </div>
  );
}

export default RemotePulsarConnectionElement;
