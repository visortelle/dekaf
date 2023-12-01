export type LocalPulsarInstance = {
  name: string,
  config: {
    type: "pulsar-standalone",
    config: PulsarStandaloneConfig
  },
  color?: string,
};

export type PulsarStandaloneConfig = {
  type: "PulsarStandaloneConfig",
  pulsarVersion: string,
  env?: Record<string, string>,
  advertisedAddress?: string,
  numBookies?: number,
  standaloneConf?: string,
  noFunctionsWorker?: boolean,
  functionsWorkerConfContent?: string,
  pulsarServicePort?: number,
  httpServicePort?: number,
  bookkeeperPort?: number,
  noStreamStorage?: boolean,
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
