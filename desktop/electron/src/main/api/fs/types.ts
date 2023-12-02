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
  dekafBin: string,
}

export type GetPathsResponse = {
  type: "GetPathsResponse",
  paths: Paths
};
