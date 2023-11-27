export type GetPaths = {
  type: "GetPaths"
};

export type Paths = {
  dataDir: string,
  configDir: string,
  javaHome: string,
  pulsarDistributionsDir: string
  pulsarInstancesDir: string,
  pulsarBin: string,
  dekafBin: string,
}

export type GetPathsResponse = {
  type: "GetPathsResponse",
  paths: Paths
};
