export type LocalPulsarConfig = {
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

export type LocalPulsarInfo = {
  diskUsage: number
}

export type CreateLocalPulsar = {
  type: "CreateLocalPulsar"
};

export type CreateLocalPulsarResult = {
  type: "CreateLocalPulsar",
}

export type ListLocalPulsar = {
  type: "ListLocalPulsars"
};

export type ListLocalPulsarsResult = {
  type: "ListLocalPulsarsResult",
}
