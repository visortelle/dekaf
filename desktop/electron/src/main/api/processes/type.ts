import { ActiveProcesses } from "./handlers";

export type HttpProbe = {
  url: string
};

export type ReadinessProbe = {
  type: "HttpProbe",
  probe: HttpProbe
} | {
  type: "AlwaysOk"
}

export type ProcessId = string;

export type SpawnProcess = {
  type: "SpawnProcess",
  processId: ProcessId,
  process: {
    type: "pulsar-standalone",
    instanceId: string
  } | {
    type: "dekaf",
    connection: {}
  }
};

export type ProcessStatus = 'alive' | 'ready' | 'failed' | 'stopped';

export type GetActiveProcesses = {
  type: "GetActiveProcesses"
};

export type GetActiveProcessesResult = {
  type: "GetActiveProcessesResult",
  processes: ActiveProcesses
}

export type ActiveProcessesUpdated = {
  type: "ActiveProcessesUpdated",
  processes: ActiveProcesses
};

export type ProcessLogEntryReceived = {
  type: "ProcessLogEntryReceived",
  processId: ProcessId,
  channel: 'stdout' | 'stderr',
  text: string,
};
