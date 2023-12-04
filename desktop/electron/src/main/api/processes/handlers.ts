import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { getPaths } from "../fs/handlers";
import { ActiveProcessesUpdated, GetActiveProcesses, GetActiveProcessesResult, LogEntry, ProcessId, ProcessLogEntryReceived, ProcessStatus, ProcessStatusUpdated, ResendProcessLogs, ResendProcessLogsResult, SpawnProcess } from "./type";
import { getInstanceConfig } from "../local-pulsar-instances/handlers";
import { v4 as uuid } from 'uuid';
import { apiChannel, logsChannel } from "../../channels";
import fsExtra from 'fs-extra';
import fsAsync from 'fs/promises';
import path from 'node:path';
import { ErrorHappened } from "../api/types";
import axios from 'axios';
import { LocalPulsarInstance, PulsarStandaloneConfig } from "../local-pulsar-instances/types";
import { ipcMain, webContents } from "electron";

export type DekafToPulsarConnection = {
  type: "local-pulsar-instance",
  instanceId: string
} | {
  type: "remote-pulsar-instance"
};

export type ActiveProcess = {
  status: ProcessStatus,
  type: {
    type: "pulsar-standalone",
    instanceConfig: LocalPulsarInstance
  } | {
    type: "dekaf",
    connection: DekafToPulsarConnection
  }
};

export type ActiveProcesses = Record<ProcessId, ActiveProcess>;

export type ActiveChildProcess = {
  childProcess: ChildProcessWithoutNullStreams,
};
export type ActiveChildProcesses = Record<ProcessId, ActiveChildProcess>;

export type ProcessLogs = Record<ProcessId, LogEntry[]>;
const processLogs: ProcessLogs = {};

function appendLog(processId: string, entry: LogEntry, event: Electron.IpcMainEvent) {
  if (processLogs[processId] === undefined) {
    processLogs[processId] = [];
  }

  processLogs[processId].push(entry);

  const req: ProcessLogEntryReceived = {
    type: "ProcessLogEntryReceived",
    entry: {
      processId,
      content: entry.content,
      epoch: entry.epoch
    }
  };
  event.reply(logsChannel, req);
}

let activeProcesses: ActiveProcesses = {};
let activeChildProcesses: ActiveChildProcesses = {};

function updateProcessStatus(processId: string, status: ProcessStatus) {
  activeProcesses[processId] = { ...activeProcesses[processId], status };

  const req: ProcessStatusUpdated = {
    type: "ProcessStatusUpdated",
    processId,
    status
  }
  webContents.getFocusedWebContents()?.send(apiChannel, req);
}

function monitorProcessStatuses() {
  async function monitorProcessStatus(processId: string, proc: ActiveProcess) {
    if (proc.type.type === "pulsar-standalone") {
      const pulsarStandaloneReadinessProbe = async (instanceConfig: LocalPulsarInstance): Promise<boolean> => {
        let isReady = false;
        try {
          await axios.get(`http://127.0.0.1:${instanceConfig.config.webServicePort}/admin/brokers/health?topicVersion=V2`, { timeout: 2000 });
          isReady = true
        } catch (err) {
          // nothing
        }

        return isReady;
      };

      const isReady = await pulsarStandaloneReadinessProbe(proc.type.instanceConfig);
      updateProcessStatus(processId, isReady ? 'ready' : 'alive');
    }
  }

  Object.entries(activeProcesses).forEach(async ([processId, proc]) => {
    await monitorProcessStatus(processId, proc);
  });
};
setInterval(monitorProcessStatuses, 3000);

function updateActiveProcesses(newActiveProcesses: ActiveProcesses, newActiveChildProcesses: ActiveChildProcesses, event: Electron.IpcMainEvent) {
  activeProcesses = newActiveProcesses;
  activeChildProcesses = newActiveChildProcesses;

  const req: ActiveProcessesUpdated = {
    type: "ActiveProcessesUpdated",
    processes: activeProcesses
  }

  event.reply(apiChannel, req);
}

export async function handleSpawnProcess(event: Electron.IpcMainEvent, arg: SpawnProcess): Promise<void> {
  try {
    if (arg.process.type === "pulsar-standalone") {
      await runPulsarStandalone(arg.process.instanceId, event);
      return;
    }
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: (err as Error).message
    };
    event.reply(apiChannel, req);
  }
}

export async function handleGetActiveProcesses(event: Electron.IpcMainEvent): Promise<void> {
  const req: GetActiveProcessesResult = {
    type: "GetActiveProcessesResult",
    processes: activeProcesses
  }

  event.reply(apiChannel, req);
}

export async function handleResendProcessLogs(event: Electron.IpcMainEvent, arg: ResendProcessLogs): Promise<void> {
  const req: ResendProcessLogsResult = {
    type: "ResendProcessLogsResult",
    correlationId: arg.correlationId,
    entries: processLogs[arg.processId] || []
  };
  event.reply(logsChannel, req);
}

export async function runPulsarStandalone(instanceId: string, event: Electron.IpcMainEvent) {
  const paths = getPaths();

  const instancePaths = paths.getPulsarStandalonePaths(instanceId);

  await fsExtra.ensureDir(instancePaths.bookkeeperDir);
  await fsExtra.ensureDir(instancePaths.metadataDir);
  await fsExtra.ensureDir(path.dirname(instancePaths.functionsWorkerConfPath));
  await fsExtra.ensureDir(path.dirname(instancePaths.standaloneConfPath));

  const instanceConfig = await getInstanceConfig(instanceId);

  const pulsarVersion = instanceConfig.config.pulsarVersion;
  const pulsarBin = paths.getPulsarBin(pulsarVersion);

  let standaloneConfContent = instanceConfig.config.standaloneConfContent || '';
  standaloneConfContent = standaloneConfContent + `\n\nbrokerServicePort=${instanceConfig.config.brokerServicePort}`;

  if (instanceConfig.config.webServicePort !== undefined) {
    standaloneConfContent = standaloneConfContent + `\n\nwebServicePort=${instanceConfig.config.webServicePort}`;
  }

  standaloneConfContent = standaloneConfContent + "\n"

  await fsAsync.writeFile(instancePaths.standaloneConfPath, standaloneConfContent, { encoding: 'utf-8' });
  await fsAsync.writeFile(instancePaths.functionsWorkerConfPath, instanceConfig.config.functionsWorkerConfContent || '', { encoding: 'utf-8' });

  let processArgs: string[] = ["standalone"];
  processArgs = [
    ...processArgs,
    "--bookkeeper-dir",
    instancePaths.bookkeeperDir,
    "--config",
    instancePaths.standaloneConfPath,
    "--functions-worker-conf",
    instancePaths.functionsWorkerConfPath,
    "--metadata-dir",
    instancePaths.metadataDir
  ];

  if (instanceConfig.config.bookkeeperPort !== undefined) {
    processArgs = [...processArgs, "--bookkeeper-port", String(instanceConfig.config.bookkeeperPort)]
  }

  if (instanceConfig.config.streamStoragePort !== undefined) {
    processArgs = [...processArgs, "--stream-storage-port", String(instanceConfig.config.streamStoragePort)]
  }

  if (instanceConfig.config.numBookies !== undefined) {
    processArgs = [...processArgs, "--num-bookies", String(instanceConfig.config.numBookies)]
  }

  if (instanceConfig.config.wipeData) {
    processArgs = [...processArgs, "--wipe-data"]
  }

  const env = {
    'JAVA_HOME': paths.javaHome,
    ...instanceConfig.config.env
  };

  const processId = uuid();
  const process = spawn(pulsarBin, processArgs, { env });
  process.stdout.setEncoding('utf-8');
  process.stderr.setEncoding('utf-8');

  // const setPulsarStandaloneLivenessCheckTimeout = () => {
  //   return setTimeout(() => {
  //     const childProcess = activeChildProcesses[processId];

  //     const check = async () => {
  //       const isPulsarStandaloneReady = await pulsarStandaloneReadinessProbe();


  //       console.log('IS READY', isPulsarStandaloneReady);
  //     };

  //     check();
  //   }, 1000);
  // }

  // setPulsarStandaloneLivenessCheckTimeout();

  const newActiveProcesses: ActiveProcesses = {
    ...activeProcesses,
    [processId]: {
      status: 'alive',
      type: {
        type: "pulsar-standalone",
        instanceConfig
      }
    }
  };

  const newActiveChildProcesses: ActiveChildProcesses = {
    ...activeChildProcesses,
    [processId]: {
      childProcess: process,
    }
  }

  updateActiveProcesses(newActiveProcesses, newActiveChildProcesses, event);

  process.stdout.on('data', (data) => {
    appendLog(processId, { processId, content: data, epoch: Date.now() }, event);
  });

  process.stderr.on('data', (data) => {
    appendLog(processId, { processId, content: data, epoch: Date.now() }, event);
  });
}

// export async function runDekaf(connection: DekafToPulsarConnection) {
//   const pulsarInstanceConfig = Object.entries(activeProcesses).find();
// }

// {
// if (!isPulsarStandaloneAlive) {
//           return;
//         }

//         const isDekafStarted = Boolean(Object.entries(activeProcesses).find(([_, p]) => {
//           return p.type.type === "dekaf" &&
//             p.type.connection.type === "local-pulsar-instance" &&
//             p.type.connection.instanceId === instanceId;
//         }));

//         if (!isDekafStarted) {
//           const connection: DekafToPulsarConnection = {
//             type: "local-pulsar-instance",
//             instanceId
//           };

//           await runDekaf(connection);
//         }
// }
