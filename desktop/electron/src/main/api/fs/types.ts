import { PulsarStandalonePaths } from "../local-pulsar-instances/types";

export type GetPaths = {
  type: "GetPaths"
};

export type Paths = {
  appPath: string,
  assetsDir: string,
  userDataDir: string,
  javaHome: string,
  pulsarDistributionsDir: string
  getPulsarDistributionDir: (version: string) => string,
  getPulsarBin: (version: string) => string,
  pulsarLocalInstancesDir: string,
  getPulsarLocalInstanceDir: (instanceId: string) => string,
  getPulsarLocalInstanceConfigPath: (instanceId: string) => string,
  getPulsarLocalInstanceDekafDataDir: (connectionId: string) => string,
  getPulsarStandalonePaths: (instanceId: string) => PulsarStandalonePaths,
  dekafDir: string,
  dekafBin: string,
  binDir: string,
  remotePulsarConnectionsDir: string,
  getRemotePulsarConnectionDir: (connectionId: string) => string,
  getRemotePulsarConnectionConfigPath: (connectionId: string) => string,
  getRemoteConnectionDekafDataDir: (connectionId: string) => string,
  dekafDemoappDir: string,
  dekafDemoappBin: string,
}

export type GetPathsResponse = {
  type: "GetPathsResponse",
  paths: Paths
};
