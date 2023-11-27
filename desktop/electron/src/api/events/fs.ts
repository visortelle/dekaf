import { Status } from "./response-status";

export type GetPathsRequest = {
  type: "GetPathsRequest"
};

export type Paths = {
  dataDir: string,
  configDir: string,
  javaHome: string,
  pulsarInstancesDir: string,
  pulsarBin: string,
  dekafBin: string
}

export type GetPathsResponse = {
  type: "GetPathsResponse",
  status: Status,
  paths?: Paths
};
