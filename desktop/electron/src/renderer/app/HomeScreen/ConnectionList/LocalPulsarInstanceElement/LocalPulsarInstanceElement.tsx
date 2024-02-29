import React, { useEffect, useState } from 'react';
import s from './LocalPulsarInstanceElement.module.css'
import { LocalPulsarInstance, UpdateLocalPulsarInstance } from '../../../../../main/api/local-pulsar-instances/types';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import { GetActiveProcesses, KillProcess, ProcessStatus, SpawnProcess } from '../../../../../main/api/processes/types';
import { v4 as uuid } from 'uuid';
import { apiChannel } from '../../../../../main/channels';
import ProcessLogsViewButton from '../../../../ui/LogsView/ProcessLogsViewButton/ProcessLogsViewButton';
import ProcessStatusIndicator from './ProcessStatusIndicator/ProcessStatusIndicator';
import { LogSource } from '../../../../ui/LogsView/ProcessLogsView/ProcessLogsView';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../../local-storage';
import * as Modals from '../../../Modals/Modals';
import NoData from '../../../../ui/NoData/NoData';
import EditLocalPulsarInstanceButton from './EditLocalPulsarInstanceButton/EditLocalPulsarInstanceButton';
import DeleteLocalPulsarInstanceButton from './DeleteLocalPulsarInstanceButton/DeleteLocalPulsarInstanceButton';
import { H3 } from '../../../../ui/H/H';
import * as I18n from '../../../I18n/I18n';
import { ListPulsarDistributions } from '../../../../../main/api/local-pulsar-distributions/types';
import PulsarDistributionPicker from './LocalPulsarInstanceEditor/PulsarDistributionPickerButton/PulsarDistributionPicker/PulsarDistributionPicker';
import { cloneDeep } from 'lodash';
import { usePrevious } from '../../../hooks/use-previous';
import { colorsByName } from '../../../../ui/ColorPickerButton/ColorPicker/color-palette';

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
  const prevPulsarProcessStatus = usePrevious(pulsarProcessStatus);
  const [dekafProcessId, setDekafProcessId] = useState<string | undefined>(undefined);
  const [dekafProcessStatus, setDekafProcessStatus] = useState<ProcessStatus | undefined>(undefined);
  const prevDekafProcessStatus = usePrevious(dekafProcessStatus);
  const [dekafDemoappProcessId, setDekafDemoappProcessId] = useState<string | undefined>(undefined);
  const [dekafDemoappProcessStatus, setDekafDemoappProcessStatus] = useState<ProcessStatus | undefined>(undefined);
  const prevDekafDemoappProcessStatus = usePrevious(dekafDemoappProcessStatus);
  const [dekafLicenseId] = useLocalStorage<string>(localStorageKeys.dekafLicenseId, { defaultValue: '' });
  const [dekafLicenseToken] = useLocalStorage<string>(localStorageKeys.dekafLicenseToken, { defaultValue: '' });
  const [isMissingPulsarDistribution, setIsMissingPulsarDistribution] = useState<boolean | undefined>(undefined);
  const [isOpenInBrowser] = useLocalStorage<boolean>(localStorageKeys.isOpenInBrowser, { defaultValue: false });

  const isWithDemoapp = Boolean(props.pulsarInstance.config.extensions?.some(ext => ext.type === "DekafDemoappExtension"));

  const startDemoapp = () => {
    const dekafDemoappReq: SpawnProcess = {
      type: "SpawnProcess",
      process: {
        type: "dekaf-demoapp",
        connection: {
          type: "local-pulsar-instance",
          instanceId: props.pulsarInstance.metadata.id,
          dekafLicenseId,
          dekafLicenseToken
        }
      },
      processId: uuid()
    };

    window.electron.ipcRenderer.sendMessage(apiChannel, dekafDemoappReq);
  }

  const startDekaf = () => {
    const dekafReq: SpawnProcess = {
      type: "SpawnProcess",
      process: {
        type: "dekaf",
        isOpenInBrowser,
        connection: {
          type: "local-pulsar-instance",
          instanceId: props.pulsarInstance.metadata.id,
          dekafLicenseId,
          dekafLicenseToken,
        }
      },
      processId: uuid()
    };

    window.electron.ipcRenderer.sendMessage(apiChannel, dekafReq);
  }

  const killPulsar = () => {
    if (pulsarProcessId === undefined) {
      return;
    }

    const req: KillProcess = { type: "KillProcess", processId: pulsarProcessId };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }

  const killAll = () => {
    if (dekafProcessId === undefined && dekafDemoappProcessId === undefined) {
      killPulsar();
      return;
    }

    let processesToKill = [dekafProcessId]
    if (isWithDemoapp && dekafDemoappProcessId !== undefined) {
      processesToKill = processesToKill.concat([dekafDemoappProcessId]);
    }

    processesToKill.forEach(processId => {
      if (processId === undefined) {
        return;
      }

      const req: KillProcess = { type: "KillProcess", processId };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    });
  }

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ActiveProcessesUpdated" || arg.type === "GetActiveProcessesResult") {
        const [maybePulsarProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "pulsar-standalone" && process.type.instanceConfig.metadata.id === props.pulsarInstance.metadata.id) || [];
        setPulsarProcessId(maybePulsarProcessId);

        const [maybeDekafProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "dekaf" && process.type.connection.type === "local-pulsar-instance" && process.type.connection.instanceId === props.pulsarInstance.metadata.id) || [];
        setDekafProcessId(maybeDekafProcessId);

        const [maybeDekafDemoappProcessId] = Object.entries(arg.processes)
          .find(([_, process]) => process.type.type === "dekaf-demoapp" && process.type.connection.type === "local-pulsar-instance" && process.type.connection.instanceId === props.pulsarInstance.metadata.id) || [];
        setDekafDemoappProcessId(maybeDekafDemoappProcessId);
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

  useEffect(() => {
    if (pulsarProcessId === undefined) {
      return;
    }

    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "DekafWindowClosed" && arg.processId === dekafProcessId) {
        killAll();
      }
    });
  }, [pulsarProcessId, dekafProcessId]);

  useEffect(() => {
    console.log('pulsarProcessStatus', prevPulsarProcessStatus, pulsarProcessStatus);
    console.log('demoappProcessStatus', prevDekafDemoappProcessStatus, dekafDemoappProcessStatus);
    console.log('dekafProcessStatus', prevDekafProcessStatus, dekafProcessStatus);
    console.log('============================================================================');
    console.log();

    if (pulsarProcessStatus === 'failed' || dekafProcessStatus === 'failed' || dekafDemoappProcessStatus === 'failed') {
      killAll();
      return;
    }

    if ((prevDekafProcessStatus === 'stopping' || prevDekafProcessStatus === 'failed') && (dekafProcessStatus === undefined || dekafProcessStatus === 'unknown')) {
      killPulsar();
      return;
    }

    if (isWithDemoapp) {
      if (prevPulsarProcessStatus !== 'ready' && pulsarProcessStatus === 'ready' && (dekafDemoappProcessStatus === undefined || dekafDemoappProcessStatus === 'unknown')) {
        startDemoapp();
        return;
      }

      if (prevDekafDemoappProcessStatus !== 'ready' && dekafDemoappProcessStatus === 'ready' && (dekafProcessStatus === undefined || dekafProcessStatus === 'unknown')) {
        startDekaf();
        return;
      }
    }

    if (prevPulsarProcessStatus !== 'ready' && pulsarProcessStatus === 'ready' && (dekafProcessStatus === undefined || dekafProcessStatus === 'unknown')) {
      startDekaf();
      return;
    }
  }, [prevPulsarProcessStatus, pulsarProcessStatus, prevDekafProcessStatus, dekafProcessStatus, prevDekafDemoappProcessStatus, dekafDemoappProcessStatus]);

  let logSources: LogSource[] = [];
  if (pulsarProcessId !== undefined) {
    logSources = logSources.concat([{ name: 'pulsar broker', processId: pulsarProcessId }]);
  }
  if (dekafProcessId !== undefined) {
    logSources = logSources.concat([{ name: 'dekaf', processId: dekafProcessId }]);
  }
  if (dekafDemoappProcessId !== undefined) {
    logSources = logSources.concat([{ name: 'demoapp', processId: dekafDemoappProcessId }]);
  }

  const isRunning =
    (pulsarProcessStatus === 'starting' ||
      pulsarProcessStatus === 'alive' ||
      pulsarProcessStatus === 'ready') ||
    (dekafProcessStatus === "starting" ||
      dekafProcessStatus === "alive" ||
      dekafProcessStatus === "ready") || (
      isWithDemoapp ? (
        dekafDemoappProcessStatus === "starting" ||
        dekafDemoappProcessStatus === "alive" ||
        dekafDemoappProcessStatus === "ready"
      ) : false
    )
  const isStopping = pulsarProcessStatus === 'stopping' || dekafProcessStatus === 'stopping' || dekafDemoappProcessStatus === 'stopping';
  const isReady = pulsarProcessStatus === 'ready' && dekafDemoappProcessStatus === 'ready' && dekafProcessStatus === 'ready';
  const isFailed = pulsarProcessStatus === 'failed' || dekafProcessStatus === 'failed' || dekafDemoappProcessStatus === 'failed';

  const renderStatus = (status: ProcessStatus | undefined): React.ReactNode => {
    switch (status) {
      case undefined: return <NoData />;
      case "unknown": return <NoData />;
      case "starting": return "starting...";
      case "alive": return "alive...";
      case "stopping": return "stopping...";
      default: return status;
    }
  }

  const isShowProcessStatuses =
    (dekafProcessStatus !== undefined && dekafProcessStatus !== 'unknown') ||
    (pulsarProcessStatus !== undefined && pulsarProcessStatus !== 'unknown') ||
    (dekafDemoappProcessStatus !== undefined && dekafDemoappProcessStatus !== 'unknown');

  const colorElement = props.pulsarInstance.metadata.color === undefined ? null : (
    <div
      style={{
        width: '24rem',
        height: '24rem',
        background: colorsByName[props.pulsarInstance.metadata.color],
        marginRight: '12rem',
        borderRadius: '4rem'
      }}
    />
  );

  return (
    <div className={s.LocalPulsarInstanceElement}>
      <div className={s.Name}>
        <H3>{colorElement}{props.pulsarInstance.metadata.name}</H3>
      </div>

      <div style={{ position: 'absolute', top: '12rem', right: '8rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent-color-blue)', opacity: '0.6', fontSize: '12rem', textAlign: 'right' }}>
        Local Instance
        {isWithDemoapp && <div>Demoapp</div>}
        {props.pulsarInstance.config.wipeData && <div>Wipe on start</div>}
      </div>

      <div><strong>Last used:</strong>&nbsp;{i18n.formatDateTime(new Date(props.pulsarInstance.metadata.lastUsedAt))}</div>

      <div><strong>Pulsar version:</strong>&nbsp;{props.pulsarInstance.config.pulsarVersion}</div>

      <div><strong>Space occupied:</strong>&nbsp;{props.pulsarInstance.size ? i18n.formatBytes(props.pulsarInstance.size) : <NoData />}</div>

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
                  <div style={{ overflow: 'auto' }}>
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

      <div style={{ display: isShowProcessStatuses ? 'block' : 'none' }}>
        <div style={{ display: 'flex', gap: '8rem', alignItems: 'center' }}>
          <ProcessStatusIndicator processId={pulsarProcessId} onStatusChange={setPulsarProcessStatus} />
          <strong>Pulsar status:&nbsp;</strong>{renderStatus(pulsarProcessStatus)}
        </div>

        {isWithDemoapp && (
          <div style={{ display: 'flex', gap: '8rem', alignItems: 'center' }}>
            <ProcessStatusIndicator processId={dekafDemoappProcessId} onStatusChange={setDekafDemoappProcessStatus} />
            <strong>Demoapp status:&nbsp;</strong>{renderStatus(dekafDemoappProcessStatus)}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8rem', alignItems: 'center' }}>
          <ProcessStatusIndicator processId={dekafProcessId} onStatusChange={setDekafProcessStatus} />
          <strong>Dekaf status:&nbsp;</strong>{renderStatus(dekafProcessStatus)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
        {(!isRunning && !isFailed && !isStopping) && <SmallButton
          type='primary'
          text='Start and Connect'
          disabled={(isRunning && !isReady) || isMissingPulsarDistribution}
          onClick={() => {
            const pulsarReq: SpawnProcess = {
              type: "SpawnProcess",
              process: {
                type: "pulsar-standalone",
                instanceId: props.pulsarInstance.metadata.id,
                instanceConfig: props.pulsarInstance
              },
              processId: uuid()
            };

            window.electron.ipcRenderer.sendMessage(apiChannel, pulsarReq);

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

        {(isRunning || isStopping || isFailed) && <SmallButton
          type='danger'
          text='Stop and Disconnect'
          disabled={isStopping}
          onClick={killAll}
        />}

        <ProcessLogsViewButton
          sources={logSources}
          disabled={pulsarProcessStatus === undefined && dekafProcessStatus === undefined}
        />

        <EditLocalPulsarInstanceButton instanceId={props.pulsarInstance.metadata.id} disabled={isRunning} />
        <DeleteLocalPulsarInstanceButton instanceId={props.pulsarInstance.metadata.id} instanceName={props.pulsarInstance.metadata.name} disabled={isRunning || isStopping} />
      </div>
    </div >
  );
}

export default LocalPulsarInstanceElement;
