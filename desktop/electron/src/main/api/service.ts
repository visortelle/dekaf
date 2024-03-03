import { GetPaths, GetPathsResponse } from './fs/types'
import { handleGetPaths } from "./fs/handlers";
import { handleCancelDownloadPulsarDistribution, handleDeletePulsarDistribution, handleDownloadPulsarDistribution, handleGetPulsarDistributionFileAtPath, handleGetPulsarDistributionStatus, handleListPulsarDistributions } from "./local-pulsar-distributions/handlers";
import { DownloadPulsarDistribution, PulsarDistributionStatusChanged, ListPulsarDistributionsResult, ListPulsarDistributions, CancelDownloadPulsarDistribution, DeletePulsarDistribution, PulsarDistributionDeleted, GetPulsarDistributionStatus, GetPulsarDistributionFileAtPath, GetPulsarDistributionFileAtPathResult } from './local-pulsar-distributions/types';
import { ErrorHappened } from './api/types';
import {
  CreateLocalPulsarInstance,
  DeleteLocalPulsarInstance,
  ListLocalPulsarInstances,
  ListLocalPulsarInstancesResult,
  LocalPulsarInstancesSizeRefreshed,
  LocalPulsarInstanceCreated,
  LocalPulsarInstanceDeleted,
  LocalPulsarInstanceUpdated,
  UpdateLocalPulsarInstance, RefreshLocalPulsarInstancesSize
} from './local-pulsar-instances/types';
import {
  handleCreateLocalPulsarInstance,
  handleDeleteLocalPulsarInstance,
  handleListLocalPulsarInstances,
  handleRefreshLocalPulsarInstancesSize,
  handleUpdateLocalPulsarInstance
} from './local-pulsar-instances/handlers';
import { ActiveProcessesUpdated, DekafWindowClosed, GetActiveProcesses, GetActiveProcessesResult, KillProcess, ProcessLogEntryReceived, ProcessStatusUpdated, ResendProcessLogs, ResendProcessLogsResult, SpawnProcess } from './processes/types';
import { handleGetActiveProcesses, handleKillProcess, handleResendProcessLogs, handleSpawnProcess } from './processes/handlers';
import { CreateRemotePulsarConnection, DeleteRemotePulsarConnection, ListRemotePulsarConnections, ListRemotePulsarConnectionsResult, RemotePulsarConnectionCreated, RemotePulsarConnectionDeleted, RemotePulsarConnectionUpdated, UpdateRemotePulsarConnection } from './remote-pulsar-connections/types';
import { handleCreateRemotePulsarConnection, handleDeleteRemotePulsarConnection, handleListRemotePulsarConnections, handleUpdateRemotePulsarConnection } from './remote-pulsar-connections/handlers';

export type ApiEvent = ErrorHappened |
  GetPaths |
  GetPathsResponse |
  ListPulsarDistributions |
  ListPulsarDistributionsResult |
  GetPulsarDistributionStatus |
  DownloadPulsarDistribution |
  CancelDownloadPulsarDistribution |
  DeletePulsarDistribution |
  PulsarDistributionDeleted |
  PulsarDistributionStatusChanged |
  GetPulsarDistributionFileAtPath |
  GetPulsarDistributionFileAtPathResult |
  CreateLocalPulsarInstance |
  UpdateLocalPulsarInstance |
  DeleteLocalPulsarInstance |
  ListLocalPulsarInstances |
  ListLocalPulsarInstancesResult |
  RefreshLocalPulsarInstancesSize |
  LocalPulsarInstancesSizeRefreshed |
  LocalPulsarInstanceCreated |
  LocalPulsarInstanceDeleted |
  LocalPulsarInstanceUpdated |
  CreateRemotePulsarConnection |
  RemotePulsarConnectionCreated |
  UpdateRemotePulsarConnection |
  RemotePulsarConnectionUpdated |
  ListRemotePulsarConnections |
  ListRemotePulsarConnectionsResult |
  DeleteRemotePulsarConnection |
  RemotePulsarConnectionDeleted |
  SpawnProcess |
  KillProcess |
  GetActiveProcesses |
  GetActiveProcessesResult |
  ActiveProcessesUpdated |
  ProcessStatusUpdated |
  ResendProcessLogs |
  ResendProcessLogsResult |
  ProcessLogEntryReceived |
  DekafWindowClosed

export type ApiService = {
  handleEvent: (event: Electron.IpcMainEvent, arg: any) => void
};

export const apiService: ApiService = {
  handleEvent: (event: Electron.IpcMainEvent, arg: ApiEvent) => {
    if (process.env.NODE_ENV === "development") {
      console.debug('Received API event:', arg);
    }

    switch (arg.type) {
      case "GetPaths": handleGetPaths(event);
        break;
      case "ListPulsarDistributions": handleListPulsarDistributions(event, arg);
        break;
      case "GetPulsarDistributionStatus": handleGetPulsarDistributionStatus(event, arg);
        break;
      case "DownloadPulsarDistribution": handleDownloadPulsarDistribution(event, arg);
        break;
      case "CancelDownloadPulsarDistributionRequest": handleCancelDownloadPulsarDistribution(event, arg);
        break;
      case "DeletePulsarDistribution": handleDeletePulsarDistribution(event, arg);
        break;
      case "GetPulsarDistributionFileAtPath": handleGetPulsarDistributionFileAtPath(event, arg);
        break;
      case "ListLocalPulsarInstances": handleListLocalPulsarInstances(event, arg);
        break;
      case "RefreshLocalPulsarInstancesSize": handleRefreshLocalPulsarInstancesSize(event, arg);
        break;
      case "CreateLocalPulsarInstance": handleCreateLocalPulsarInstance(event, arg);
        break;
      case "UpdateLocalPulsarInstance": handleUpdateLocalPulsarInstance(event, arg);
        break;
      case "DeleteLocalPulsarInstance": handleDeleteLocalPulsarInstance(event, arg);
        break;
      case "ListRemotePulsarConnections": handleListRemotePulsarConnections(event, arg);
        break;
      case "CreateRemotePulsarConnection": handleCreateRemotePulsarConnection(event, arg);
        break;
      case "UpdateRemotePulsarConnection": handleUpdateRemotePulsarConnection(event, arg);
        break;
      case "DeleteRemotePulsarConnection": handleDeleteRemotePulsarConnection(event, arg);
        break;
      case "GetActiveProcesses": handleGetActiveProcesses(event);
        break;
      case "SpawnProcess": handleSpawnProcess(event, arg);
        break;
      case "KillProcess": handleKillProcess(event, arg);
        break;
      case "ResendProcessLogs": handleResendProcessLogs(event, arg);
        break;
    }
  }
};
