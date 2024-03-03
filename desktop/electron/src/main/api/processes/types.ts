import { ChildProcessWithoutNullStreams } from "child_process";
import { LocalPulsarInstance } from "../local-pulsar-instances/types";
import { BrowserWindow } from "electron";

export type ProcessId = string;

export type SpawnProcess = {
  type: "SpawnProcess",
  processId: ProcessId,
  process: {
    type: "pulsar-standalone",
    instanceId: string,
    instanceConfig: LocalPulsarInstance
  } | {
    type: "dekaf",
    connection: DekafToPulsarConnection,
    isOpenInBrowser: boolean
  } | {
    type: "dekaf-demoapp",
    connection: DekafToPulsarConnection
  }
};

export type KillProcess = {
  type: "KillProcess",
  processId: string,
  isForce?: boolean
};

export type DekafToPulsarConnection = {
  dekafLicenseId: string,
  dekafLicenseToken: string
} & ({
  type: "local-pulsar-instance",
  instanceId: string
} | {
  type: "remote-pulsar-connection",
  connectionId: string
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
    runtimeConfig: DekafRuntimeConfig,
    isOpenInBrowser: boolean
  } | {
    type: "dekaf-demoapp",
    connection: DekafToPulsarConnection
  }
};

export type ActiveProcesses = Record<ProcessId, ActiveProcess>;

export type ActiveChildProcess = {
  childProcess: ChildProcessWithoutNullStreams,
};
export type ActiveChildProcesses = Record<ProcessId, ActiveChildProcess>;

export type ActiveWindows = Record<ProcessId, BrowserWindow>;

export type ProcessLogs = Record<ProcessId, LogEntry[]>;

export type ProcessStatus = 'unknown' | 'starting' | 'alive' | 'ready' | 'stopping' | 'failed';

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

export type DekafWindowClosed = {
  type: "DekafWindowClosed",
  processId: string
};
