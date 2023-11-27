import { GetPathsRequest, GetPathsResponse } from "./events/fs";
import { GetPulsarDistributionsRequest, GetPulsarDistributionsResponse } from "./events/local-pulsar-distribution";
import { handleGetPaths } from "./handlers/fs";
import { handleGetPulsarDistributions } from "./handlers/local-pulsar-distributions";

export type ApiEvent = GetPathsRequest |
  GetPathsResponse |
  GetPulsarDistributionsRequest |
  GetPulsarDistributionsResponse;

export type ApiService = {
  handleEvent: (event: Electron.IpcMainEvent, arg: any) => void
};

export const apiService: ApiService = {
  handleEvent: (event: Electron.IpcMainEvent, arg: ApiEvent) => {
    switch(arg.type) {
      case "GetPathsRequest": handleGetPaths(event);
        break;
      case "GetPulsarDistributionsRequest": handleGetPulsarDistributions(event);
        break;
    }
  }
};
