export type LocalPulsarInstance = {
  name: string,
  version: string,
  color?: string,
  standaloneConf?: string,
  env?: Record<string, string>,
  numBookies?: number,
  noFunctionsWorker?: boolean,
  functionsWorkerConf?: string,
  pulsarServicePort?: number,
  httpServicePort?: number
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
