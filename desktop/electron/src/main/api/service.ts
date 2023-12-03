import { GetPaths, GetPathsResponse } from './fs/types'
import { handleGetPaths } from "./fs/handlers";
import { handleCancelDownloadPulsarDistribution, handleDeletePulsarDistribution, handleDownloadPulsarDistribution, handleGetPulsarDistributionFileAtPath, handleGetPulsarDistributionStatus, handleListPulsarDistributions } from "./local-pulsar-distributions/handlers";
import { DownloadPulsarDistribution, PulsarDistributionStatusChanged, ListPulsarDistributionsResult, ListPulsarDistributions, CancelDownloadPulsarDistribution, DeletePulsarDistribution, PulsarDistributionDeleted, GetPulsarDistributionStatus, GetPulsarDistributionFileAtPath, GetPulsarDistributionFileAtPathResult } from './local-pulsar-distributions/types';
import { ErrorHappened } from './api/types';
import { CreateLocalPulsarInstance, DeleteLocalPulsarInstance, ListLocalPulsarInstances, ListLocalPulsarInstancesResult, UpdateLocalPulsarInstance } from './local-pulsar-instances/types';
import { handleCreateLocalPulsarInstance, handleDeleteLocalPulsarInstance, handleListLocalPulsarInstances, handleUpdateLocalPulsarInstance } from './local-pulsar-instances/handlers';
import { ActiveProcessesUpdated, GetActiveProcesses, GetActiveProcessesResult, ProcessLogEntryReceived, ResendProcessLogs, ResendProcessLogsResult, SpawnProcess } from './processes/type';
import { handleGetActiveProcesses, handleResendProcessLogs, handleSpawnProcess } from './processes/handlers';

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
  SpawnProcess |
  GetActiveProcesses |
  GetActiveProcessesResult |
  ActiveProcessesUpdated |
  ResendProcessLogs |
  ResendProcessLogsResult |
  ProcessLogEntryReceived

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
      case "ListPulsarDistributions": handleListPulsarDistributions(event);
        break;
      case "GetPulsarDistributionStatus": handleGetPulsarDistributionStatus(event, arg);
        break;
      case "DownloadPulsarDistribution": handleDownloadPulsarDistribution(event, arg);
        break;
      case "CancelDownloadPulsarDistributionRequest": handleCancelDownloadPulsarDistribution(event, arg);
        break;
      case "DeletePulsarDistribution": handleDeletePulsarDistribution(event, arg);
        break;
      case "ListLocalPulsarInstances": handleListLocalPulsarInstances(event, arg);
        break;
      case "CreateLocalPulsarInstance": handleCreateLocalPulsarInstance(event, arg);
        break;
      case "UpdateLocalPulsarInstance": handleUpdateLocalPulsarInstance(event, arg);
        break;
      case "DeleteLocalPulsarInstance": handleDeleteLocalPulsarInstance(event, arg);
        break;
      case "GetPulsarDistributionFileAtPath": handleGetPulsarDistributionFileAtPath(event, arg);
        break;
      case "GetActiveProcesses": handleGetActiveProcesses(event);
        break;
      case "SpawnProcess": handleSpawnProcess(event, arg);
        break;
      case "ResendProcessLogs": handleResendProcessLogs(event, arg);
        break;
    }
  }
};
