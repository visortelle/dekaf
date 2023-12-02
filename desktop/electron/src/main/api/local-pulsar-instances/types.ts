export type LocalPulsarInstance = {
  type: "LocalPulsarInstance"
  name: string,
  color?: string,
  config: PulsarStandaloneConfig
};

export type PulsarStandaloneConfig = {
  type: "PulsarStandaloneConfig",
  pulsarVersion: string,
  env?: Record<string, string>,
  numBookies?: number,
  standaloneConfContent?: string,
  functionsWorkerConfContent?: string,
  brokerServicePort?: number,
  webServicePort?: number,
  bookkeeperPort?: number,
  streamStoragePort?: number,
  wipeData?: boolean
};

export type LocalPulsarInstanceInfo = {
  diskUsage: number
}

export type CreateLocalPulsarInstance = {
  type: "CreateLocalPulsarInstance",
  config: LocalPulsarInstance
};

export type ListLocalPulsarInstances = {
  type: "ListLocalPulsarInstances"
};

export type ListLocalPulsarInstancesResult = {
  type: "ListLocalPulsarInstancesResult",
  configs: LocalPulsarInstance[]
}
