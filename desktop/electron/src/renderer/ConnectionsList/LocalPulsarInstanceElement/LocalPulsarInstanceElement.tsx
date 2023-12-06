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
import * as Modals from '../../app/Modals/Modals';
import NoData from '../../ui/NoData/NoData';
import EditLocalPulsarInstanceButton from '../../EditLocalPulsarInstanceButton/EditLocalPulsarInstanceButton';
import DeleteLocalPulsarInstanceButton from '../../DeleteLocalPulsarInstanceButton/DeleteLocalPulsarInstanceButton';
import { H3 } from '../../ui/H/H';
import * as I18n from '../../app/I18n/I18n';
import { ListPulsarDistributions } from '../../../main/api/local-pulsar-distributions/types';
import PulsarDistributionPicker from '../../LocalPulsarInstanceEditor/PulsarDistributionPickerButton/PulsarDistributionPicker/PulsarDistributionPicker';
import { cloneDeep } from 'lodash';

const getInstalledPulsarVersions = () => {
  const req: ListPulsarDistributions = { type: "ListPulsarDistributions", isInstalledOnly: true };
  window.electron.ipcRenderer.sendMessage(apiChannel, req);
};

export type LocalPulsarInstanceElementProps = {
  pulsarInstance: LocalPulsarInstance
};

const LocalPulsarInstanceElement: React.FC<LocalPulsarInstanceElementProps> = (props) => {
  const i18n = I18n.useContext();
  const modals = Modals.useContext();
  const [pulsarProcessId, setPulsarProcessId] = useState<string | undefined>(undefined);
  const [pulsarProcessStatus, setPulsarProcessStatus] = useState<ProcessStatus | undefined>(undefined);
  const [dekafProcessId, setDekafProcessId] = useState<string | undefined>(undefined);
  const [dekafProcessStatus, setDekafProcessStatus] = useState<ProcessStatus | undefined>(undefined);
  const [dekafLicenseId] = useLocalStorage<string>(localStorageKeys.dekafLicenseId, { defaultValue: '' });
  const [dekafLicenseToken] = useLocalStorage<string>(localStorageKeys.dekafLicenseToken, { defaultValue: '' });
  const [isMissingPulsarDistribution, setIsMissingPulsarDistribution] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ActiveProcessesUpdated" || arg.type === "GetActiveProcessesResult") {
        const [maybePulsarProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "pulsar-standalone" && process.type.instanceConfig.metadata.id === props.pulsarInstance.metadata.id) || [];
        setPulsarProcessId(maybePulsarProcessId);

        const [maybeDekafProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "dekaf" && process.type.connection.type === "local-pulsar-instance" && process.type.connection.instanceId === props.pulsarInstance.metadata.id) || [];
        setDekafProcessId(maybeDekafProcessId);
      } else if (arg.type === "ListPulsarDistributionsResult" && arg.isInstalledOnly) {
        const isInstalled = arg.versions?.includes(props.pulsarInstance.config.pulsarVersion);
        setIsMissingPulsarDistribution(!isInstalled);
      } else if (arg.type === "PulsarDistributionDeleted" && props.pulsarInstance.config.pulsarVersion === arg.version) {
        setIsMissingPulsarDistribution(true);
      }
    });

    getInstalledPulsarVersions();

    const req: GetActiveProcesses = { type: "GetActiveProcesses" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, [props.pulsarInstance]);

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
      <H3>{props.pulsarInstance.metadata.name}</H3>

      <div><strong>Last used:</strong>&nbsp;{i18n.formatDateTime(new Date(props.pulsarInstance.metadata.lastUsedAt))}</div>

      <div><strong>Pulsar version:</strong>&nbsp;{props.pulsarInstance.config.pulsarVersion}</div>
      {isMissingPulsarDistribution && (
        <div style={{ display: 'flex', gap: '12rem', alignItems: 'center' }}>
          <div style={{ color: 'var(--accent-color-red)' }}>Selected Pulsar version is not installed.</div>
          <SmallButton
            text='Repair'
            type='primary'
            onClick={() => {
              modals.push({
                id: 'create-local-pulsar-instance-button-select-pulsar-distribution',
                title: 'Select Pulsar Version',
                content: (
                  <div style={{ maxHeight: 'inherit', overflow: 'auto' }}>
                    <PulsarDistributionPicker
                      onSelectVersion={(version) => {
                        modals.pop();

                        const newLocalPulsarInstance: LocalPulsarInstance = cloneDeep(props.pulsarInstance);
                        newLocalPulsarInstance.config.pulsarVersion = version;

                        const req: UpdateLocalPulsarInstance = {
                          type: "UpdateLocalPulsarInstance",
                          config: newLocalPulsarInstance
                        }
                        window.electron.ipcRenderer.sendMessage(apiChannel, req);

                        getInstalledPulsarVersions();
                      }}
                    />
                  </div>
                ),
                styleMode: 'no-content-padding'
              })
            }}
          />
        </div>
      )}
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
          disabled={isStopping || isMissingPulsarDistribution}
          onClick={() => {
            const pulsarReq: SpawnProcess = {
              type: "SpawnProcess",
              process: {
                type: "pulsar-standalone",
                instanceId: props.pulsarInstance.metadata.id,
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
                  instanceId: props.pulsarInstance.metadata.id,
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
                metadata: {
                  ...props.pulsarInstance.metadata,
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

        <ProcessLogsViewButton
          sources={logSources}
          disabled={pulsarProcessStatus === undefined && dekafProcessStatus === undefined}
        />

        <EditLocalPulsarInstanceButton instanceId={props.pulsarInstance.metadata.id} disabled={isRunning} />
        <DeleteLocalPulsarInstanceButton instanceId={props.pulsarInstance.metadata.id} instanceName={props.pulsarInstance.metadata.name} disabled={isRunning} />
      </div>
    </div>
  );
}

export default LocalPulsarInstanceElement;
