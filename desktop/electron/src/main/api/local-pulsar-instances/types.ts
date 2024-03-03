import { ConnectionMetadata } from "../dekaf/types";

export type PulsarStandalonePaths = {
  metadataDir: string,
  bookkeeperDir: string,
  standaloneConfPath: string,
  functionsWorkerConfPath: string,
};

export type LocalPulsarInstance = {
  type: "LocalPulsarInstance"
  metadata: ConnectionMetadata,
  config: PulsarStandaloneConfig,
  size?: number,
};

export type PulsarStandaloneExtension = {
  type: "DekafDemoappExtension"
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
  wipeData?: boolean,
  extensions?: PulsarStandaloneExtension[]
};

export type LocalPulsarInstanceInfo = {
  diskUsage: number
}

export type CreateLocalPulsarInstance = {
  type: "CreateLocalPulsarInstance",
  config: LocalPulsarInstance
};

export type LocalPulsarInstanceCreated = {
  type: "LocalPulsarInstanceCreated",
  instanceId: string
}

export type UpdateLocalPulsarInstance = {
  type: "UpdateLocalPulsarInstance",
  config: LocalPulsarInstance
};

export type LocalPulsarInstanceUpdated = {
  type: "LocalPulsarInstanceUpdated",
  instanceId: string
}

export type DeleteLocalPulsarInstance = {
  type: "DeleteLocalPulsarInstance",
  instanceId: string
}

export type LocalPulsarInstanceDeleted = {
  type: "LocalPulsarInstanceDeleted",
  instanceId: string
}

export type ListLocalPulsarInstances = {
  type: "ListLocalPulsarInstances"
};

export type ListLocalPulsarInstancesResult = {
  type: "ListLocalPulsarInstancesResult",
  configs: LocalPulsarInstance[]
}

export type RefreshLocalPulsarInstancesSize = {
  type: "RefreshLocalPulsarInstancesSize",
}

export type LocalPulsarInstancesSizeRefreshed = {
  type: "LocalPulsarInstancesSizeRefreshed",
  instancesSizeMap: Map<string, number | undefined>
}

