import { GetPaths, GetPathsResponse } from './fs/types'
import { handleGetPaths } from "./fs/handlers";
import { handleCancelDownloadPulsarDistribution, handleDownloadPulsarDistribution, handleListPulsarDistributions } from "./local-pulsar-distributions/handlers";
import { DownloadPulsarDistribution, PulsarDistributionStatusChanged, ListPulsarDistributionsResult, ListPulsarDistributions, CancelDownloadPulsarDistribution } from './local-pulsar-distributions/types';
import { ErrorHappened } from './api/types';

export type ApiEvent = ErrorHappened |
  GetPaths |
  GetPathsResponse |
  ListPulsarDistributions |
  ListPulsarDistributionsResult |
  DownloadPulsarDistribution |
  CancelDownloadPulsarDistribution |
  PulsarDistributionStatusChanged


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
      case "DownloadPulsarDistribution": handleDownloadPulsarDistribution(event, arg);
        break;
      case "CancelDownloadPulsarDistributionRequest": handleCancelDownloadPulsarDistribution(event, arg);
        break;
    }
  }
};
