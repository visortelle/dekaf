import React, { useEffect, useState } from 'react';
import s from './RemotePulsarConnectionElement.module.css'
import { apiChannel } from '../../../../../main/channels';
import { RemotePulsarConnection, UpdateRemotePulsarConnection } from '../../../../../main/api/remote-pulsar-connections/types';
import { GetActiveProcesses, KillProcess, ProcessStatus, SpawnProcess } from '../../../../../main/api/processes/types';
import { localStorageKeys } from '../../../local-storage';
import useLocalStorage from 'use-local-storage-state';
import NoData from '../../../../ui/NoData/NoData';
import { H3 } from '../../../../ui/H/H';
import * as I18n from '../../../I18n/I18n';
import ProcessStatusIndicator from '../LocalPulsarInstanceElement/ProcessStatusIndicator/ProcessStatusIndicator';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import { v4 as uuid } from 'uuid';
import { LogSource } from '../../../../ui/LogsView/ProcessLogsView/ProcessLogsView';
import ProcessLogsViewButton from '../../../../ui/LogsView/ProcessLogsViewButton/ProcessLogsViewButton';
import EditRemotePulsarConnectionButton from './EditRemotePulsarConnectionButton/EditRemotePulsarConnectionButton';
import DeleteLocalPulsarInstanceButton from '../LocalPulsarInstanceElement/DeleteLocalPulsarInstanceButton/DeleteLocalPulsarInstanceButton';

export type RemotePulsarConnectionElementProps = {
  connection: RemotePulsarConnection
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
          .find(([_, process]) => process.type.type === "dekaf" && process.type.connection.type === "remote-pulsar-connection" && process.type.connection.connectionId === props.connection.metadata.id) || [];
        setDekafProcessId(maybeDekafProcessId);
      }
    });

    const req: GetActiveProcesses = { type: "GetActiveProcesses" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, [props.connection]);

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

  const isShowProcessStatuses = dekafProcessStatus !== undefined && dekafProcessStatus !== 'unknown';

  console.log('is show', isShowProcessStatuses, dekafProcessStatus)

  return (
    <div className={s.RemotePulsarConnectionElement}>
      <H3>{props.connection.metadata.name}</H3>
      <div><strong>Last used:</strong>&nbsp;{i18n.formatDateTime(new Date(props.connection.metadata.lastUsedAt))}</div>

      {isShowProcessStatuses && (
        <div style={{ display: 'flex', gap: '8rem', alignItems: 'center' }}>
          <ProcessStatusIndicator processId={dekafProcessId} onStatusChange={setDekafProcessStatus} />
          <strong>Dekaf status:&nbsp;</strong>{renderStatus(dekafProcessStatus)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
        {!isRunning && <SmallButton
          type='primary'
          text='Connect'
          disabled={isStopping}
          onClick={() => {
            const dekafReq: SpawnProcess = {
              type: "SpawnProcess",
              process: {
                type: "dekaf",
                connection: {
                  type: "remote-pulsar-connection",
                  connectionId: props.connection.metadata.id,
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
                ...props.connection,
                metadata: {
                  ...props.connection.metadata,
                  lastUsedAt: Date.now()
                }
              }
            }

            window.electron.ipcRenderer.sendMessage(apiChannel, updateReq);
          }}
        />}

        {isRunning && <SmallButton
          type='regular'
          text='Disconnect'
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

        <EditRemotePulsarConnectionButton connectionId={props.connection.metadata.id} disabled={isRunning} />
        <DeleteLocalPulsarInstanceButton instanceId={props.connection.metadata.id} instanceName={props.connection.metadata.name} disabled={isRunning} />
      </div>
    </div>
  );
}

export default RemotePulsarConnectionElement;
