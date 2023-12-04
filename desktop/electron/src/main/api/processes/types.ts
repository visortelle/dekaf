import { ChildProcessWithoutNullStreams } from "child_process";
import { LocalPulsarInstance } from "../local-pulsar-instances/types";

export type ProcessId = string;

export type SpawnProcess = {
  type: "SpawnProcess",
  processId: ProcessId,
  process: {
    type: "pulsar-standalone",
    instanceId: string
  } | {
    type: "dekaf",
    connection: DekafToPulsarConnection
  }
};

export type DekafToPulsarConnection = {
  dekafLicenseId: string,
  dekafLicenseToken: string
} & ({
  type: "local-pulsar-instance",
  instanceId: string
} | {
  type: "remote-pulsar-instance",
  instanceId: string
});

export type DekafRuntimeConfig = {
  port: number,
  publicBaseUrl: string
};

export type ActiveProcess = {
  status: ProcessStatus,
  type: {
    type: "pulsar-standalone",
    instanceConfig: LocalPulsarInstance
  } | {
    type: "dekaf",
    connection: DekafToPulsarConnection,
    runtimeConfig: DekafRuntimeConfig
  }
};

export type ActiveProcesses = Record<ProcessId, ActiveProcess>;

export type ActiveChildProcess = {
  childProcess: ChildProcessWithoutNullStreams,
};
export type ActiveChildProcesses = Record<ProcessId, ActiveChildProcess>;

export type ProcessLogs = Record<ProcessId, LogEntry[]>;

export type ProcessStatus = 'unknown' | 'alive' | 'ready' | 'failed';

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

export type ProcessStatusUpdated = {
  type: "ProcessStatusUpdated",
  processId: string,
  status: ProcessStatus
};

export type LogEntry = {
  processId: ProcessId,
  content: string,
  epoch: number
}

export type ResendProcessLogs = {
  type: "ResendProcessLogs",
  correlationId: string
  processId: string,
}

export type ResendProcessLogsResult = {
  type: "ResendProcessLogsResult",
  correlationId: string
  entries: LogEntry[],
}

export type ProcessLogEntryReceived = {
  type: "ProcessLogEntryReceived",
  entry: LogEntry
};
