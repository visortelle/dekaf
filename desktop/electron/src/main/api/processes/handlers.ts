import { spawn } from "child_process";
import { getPaths } from "../fs/handlers";
import { ActiveChildProcesses, ActiveProcess, ActiveProcesses, ActiveProcessesUpdated, DekafRuntimeConfig, DekafToPulsarConnection, GetActiveProcessesResult, KillProcess, LogEntry, ProcessId, ProcessLogEntryReceived, ProcessLogs, ProcessStatus, ProcessStatusUpdated, ResendProcessLogs, ResendProcessLogsResult, SpawnProcess } from "./types";
import { getInstanceConfig } from "../local-pulsar-instances/handlers";
import { v4 as uuid } from 'uuid';
import { apiChannel, logsChannel } from "../../channels";
import fs from 'node:fs';
import fsExtra from 'fs-extra';
import fsAsync from 'fs/promises';
import path from 'node:path';
import { ErrorHappened } from "../api/types";
import axios from 'axios';
import { LocalPulsarInstance } from "../local-pulsar-instances/types";
import { BrowserWindow } from "electron";
import portfinder from 'portfinder';
import { colorsByName } from "../../../renderer/ui/ColorPickerButton/ColorPicker/color-palette";
import { sendMessage } from "../api/send-message";
import { getConnectionConfig } from "../remote-pulsar-connections/handlers";

portfinder.setBasePort(13200);
portfinder.setHighestPort(13300);

const sigTermExitCode = 143;
const processLogs: ProcessLogs = {};

function appendLog(processId: ProcessId, entry: LogEntry, event: Electron.IpcMainEvent) {
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

const activeProcesses: ActiveProcesses = {};
const activeChildProcesses: ActiveChildProcesses = {};

function getProcessStatus(processId: ProcessId): ProcessStatus | undefined {
  return activeProcesses[processId].status;
}

function deleteProcess(processId: ProcessId) {
  delete activeProcesses[processId];
  delete activeChildProcesses[processId];
  delete processLogs[processId];

  const req: GetActiveProcessesResult = {
    type: "GetActiveProcessesResult",
    processes: activeProcesses
  }
  sendMessage(apiChannel, req);
}

function updateProcessStatus(processId: ProcessId, status: ProcessStatus) {
  const proc = activeProcesses[processId];

  if (proc.status === status) {
    return;
  }

  if (proc.status === 'stopping' && (status === 'alive' || status === 'ready')) {
    // XXX - probably wrong place to do that.
    // You may want to move it to the right place during process statuses monitor refactoring.
    return;
  }

  activeProcesses[processId] = { ...proc, status };

  const req: ProcessStatusUpdated = {
    type: "ProcessStatusUpdated",
    processId,
    status
  }

  sendMessage(apiChannel, req);

  if (proc.type.type === "dekaf" && status === 'ready') {
    const url = proc.type.runtimeConfig.publicBaseUrl;
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      backgroundColor: '#f5f5f5',
    });
    win.loadURL(url);
    win.once('ready-to-show', () => {
      win.show();
      win.maximize();
    });
    win.on('close', () => {
      const req: KillProcess = {
        type: "KillProcess",
        processId
      };
      sendMessage(apiChannel, req);
    })
  }
}

function monitorProcessStatuses() {
  async function monitorProcessStatus(processId: ProcessId, proc: ActiveProcess) {
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
      if (getProcessStatus(processId) !== 'failed') {
        updateProcessStatus(processId, isReady ? 'ready' : 'alive');
      }

    } else if (proc.type.type === "dekaf") {
      const dekafReadinessProbe = async (runtimeConfig: DekafRuntimeConfig): Promise<boolean> => {
        let isReady = false;
        try {
          await axios.get(`${runtimeConfig.publicBaseUrl}/health`, { timeout: 2000 });
          isReady = true
        } catch (err) {
          // nothing
        }

        return isReady;
      };

      const isReady = await dekafReadinessProbe(proc.type.runtimeConfig);
      if (getProcessStatus(processId) !== 'failed') {
        updateProcessStatus(processId, isReady ? 'ready' : 'alive');
      }
    } else if (proc.type.type === "dekaf-demoapp") {
      if (getProcessStatus(processId) !== 'failed') {
        updateProcessStatus(processId, 'ready');
      }
    }
  }

  Object.entries(activeProcesses).forEach(async ([processId, proc]) => {
    await monitorProcessStatus(processId, proc);
  });
};
setInterval(monitorProcessStatuses, 3000);

function updateActiveProcesses(newActiveProcesses: ActiveProcesses, newActiveChildProcesses: ActiveChildProcesses, event: Electron.IpcMainEvent) {
  Object.entries(newActiveProcesses).forEach(([processId, proc]) => {
    activeProcesses[processId] = proc;
  });

  Object.entries(newActiveChildProcesses).forEach(([processId, proc]) => {
    activeChildProcesses[processId] = proc;
  });

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
    } else if (arg.process.type === "dekaf") {
      await runDekaf(arg.process.connection, event);
    } else if (arg.process.type === "dekaf-demoapp") {
      await runDekafDemoapp(arg.process.connection, event);
    }
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: (err as Error).message
    };
    event.reply(apiChannel, req);
  }
}

export async function handleKillProcess(event: Electron.IpcMainEvent, arg: KillProcess): Promise<void> {
  const proc = activeChildProcesses[arg.processId];

  if (proc === undefined) {
    console.warn(`Unable to kill process. No such process ${arg.processId}`);
  }

  if (activeProcesses[arg.processId].status === 'failed') {
    deleteProcess(arg.processId);
    return;
  }

  proc.childProcess.kill();

  updateProcessStatus(arg.processId, 'stopping');
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

  const newActiveProcesses: ActiveProcesses = {
    ...activeProcesses,
    [processId]: {
      status: 'starting',
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
    (data as string).split('\n\n').forEach(line => {
      appendLog(processId, { processId, content: line, epoch: Date.now() }, event);
    });
  });

  process.stderr.on('data', (data) => {
    (data as string).split('\n\n').forEach(line => {
      appendLog(processId, { processId, content: line, epoch: Date.now() }, event);
    });
  });

  process.on('exit', (code) => {
    if (code === 0 || code === sigTermExitCode || code === null) {
      updateProcessStatus(processId, 'unknown');
      deleteProcess(processId);
      return;
    }

    updateProcessStatus(processId, 'failed');
  });
}

export async function runDekaf(connection: DekafToPulsarConnection, event: Electron.IpcMainEvent) {
  const paths = getPaths();

  const connectionId = connection.type === "local-pulsar-instance" ? connection.instanceId : connection.connectionId;

  const dekafDataDir = connection.type === "local-pulsar-instance" ? paths.getPulsarLocalInstanceDekafDataDir(connectionId) : paths.getRemoteConnectionDekafDataDir(connectionId);
  if (!(fs.existsSync(dekafDataDir))) {
    await fsExtra.ensureDir(dekafDataDir);
    const defaultDataDir = path.resolve(path.join(paths.dekafDir, "data"));
    await fsExtra.copy(defaultDataDir, dekafDataDir);
  }

  const port = await portfinder.getPortPromise();
  const publicBaseUrl = `http://127.0.0.1:${port}`;

  const javaHome = paths.javaHome;

  let processArgs: string[] = [];
  let env: Record<string, string> = {
    "JAVA_HOME": javaHome,
    "DEKAF_DATA_DIR": dekafDataDir,
    "DEKAF_PORT": String(port),
    "DEKAF_PUBLIC_BASE_URL": publicBaseUrl,
  };

  if (connection.dekafLicenseId.length) {
    env["DEKAF_LICENSE_ID"] = connection.dekafLicenseId;
  }

  if (connection.dekafLicenseToken.length) {
    env["DEKAF_LICENSE_TOKEN"] = connection.dekafLicenseToken;
  }

  if (connection.type === "local-pulsar-instance") {
    const instanceConfig = await getInstanceConfig(connection.instanceId);

    env["DEKAF_PULSAR_NAME"] = instanceConfig.metadata.name;

    if (instanceConfig.metadata.color !== undefined) {
      env["DEKAF_PULSAR_COLOR"] = colorsByName[instanceConfig.metadata.color] || instanceConfig.metadata.color;
    }

    env["DEKAF_PULSAR_BROKER_URL"] = `pulsar://127.0.0.1:${instanceConfig.config.brokerServicePort}`
    env["DEKAF_PULSAR_WEB_URL"] = `http://127.0.0.1:${instanceConfig.config.webServicePort}`
  }

  if (connection.type === "remote-pulsar-connection") {
    const connectionConfig = await getConnectionConfig(connection.connectionId);
    const config = connectionConfig.config;

    env["DEKAF_PULSAR_NAME"] = connectionConfig.metadata.name;

    if (connectionConfig.metadata.color !== undefined) {
      env["DEKAF_PULSAR_COLOR"] = colorsByName[connectionConfig.metadata.color] || connectionConfig.metadata.color;
    }

    env["DEKAF_PULSAR_BROKER_URL"] = config.pulsarBrokerUrl
    env["DEKAF_PULSAR_WEB_URL"] = config.pulsarWebUrl

    if (config.auth !== undefined) {
      env["DEKAF_DEFAULT_PULSAR_AUTH"] = JSON.stringify(config.auth);
    }

    if (config.pulsarListenerName !== undefined) {
      env["DEKAF_PULSAR_LISTENER_NAME"] = config.pulsarListenerName;
    }

    if (config.pulsarTlsKeyFilePath !== undefined) {
      env["DEKAF_PULSAR_TLS_KEY_FILE_PATH"] = config.pulsarTlsKeyFilePath;
    }

    if (config.pulsarTlsCertificateFilePath !== undefined) {
      env["DEKAF_PULSAR_TLS_CERTIFICATE_FILE_PATH"] = config.pulsarTlsCertificateFilePath;
    }

    if (config.pulsarTlsTrustCertsFilePath !== undefined) {
      env["DEKAF_PULSAR_TLS_TRUST_CERTS_FILE_PATH"] = config.pulsarTlsTrustCertsFilePath;
    }

    if (config.pulsarAllowTlsInsecureConnection) {
      env["DEKAF_PULSAR_ALLOW_TLS_INSECURE_CONNECTION"] = "true";
    }

    if (config.pulsarEnableTlsHostnameVerification) {
      env["DEKAF_PULSAR_ALLOW_TLS_HOSTNAME_VERIFICATION"] = "true";
    }

    if (config.pulsarUseKeyStoreTls) {
      env["DEKAF_PULSAR_USE_KEY_STORE_TLS"] = "true";
    }

    if (config.pulsarSslProvider !== undefined) {
      env["DEKAF_PULSAR_SSL_PROVIDER"] = config.pulsarSslProvider;
    }

    if (config.pulsarTlsKeyStoreType !== undefined) {
      env["DEKAF_PULSAR_TLS_KEY_STORE_TYPE"] = config.pulsarTlsKeyStoreType;
    }

    if (config.pulsarTlsKeyStorePath !== undefined) {
      env["DEKAF_PULSAR_TLS_KEY_STORE_PATH"] = config.pulsarTlsKeyStorePath;
    }

    if (config.pulsarTlsKeyStorePassword !== undefined) {
      env["DEKAF_PULSAR_TLS_KEY_STORE_PASSWORD"] = config.pulsarTlsKeyStorePassword;
    }

    if (config.pulsarTlsTrustStoreType !== undefined) {
      env["DEKAF_PULSAR_TLS_TRUST_STORE_TYPE"] = config.pulsarTlsTrustStoreType;
    }

    if (config.pulsarTlsTrustStorePath !== undefined) {
      env["DEKAF_PULSAR_TLS_TRUST_STORE_PATH"] = config.pulsarTlsTrustStorePath;
    }

    if (config.pulsarTlsTrustStorePassword !== undefined) {
      env["DEKAF_PULSAR_TLS_TRUST_STORE_PASSWORD"] = config.pulsarTlsTrustStorePassword;
    }

    if (config.pulsarTlsCiphers !== undefined) {
      env["DEKAF_PULSAR_TLS_CIPHERS"] = config.pulsarTlsCiphers;
    }

    if (config.pulsarTlsProtocols !== undefined) {
      env["DEKAF_PULSAR_TLS_PROTOCOLS"] = config.pulsarTlsProtocols;
    }
  }

  const dekafBin = paths.dekafBin;
  const processId = uuid();

  const process = spawn(dekafBin, processArgs, { env });
  process.stdout.setEncoding('utf-8');
  process.stderr.setEncoding('utf-8');

  const newActiveProcesses: ActiveProcesses = {
    ...activeProcesses,
    [processId]: {
      status: 'starting',
      type: {
        type: "dekaf",
        connection,
        runtimeConfig: {
          port,
          publicBaseUrl
        }
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
    (data as string).split('\n\n').forEach(line => {
      appendLog(processId, { processId, content: line, epoch: Date.now() }, event);
    });
  });

  process.stderr.on('data', (data) => {
    (data as string).split('\n\n').forEach(line => {
      appendLog(processId, { processId, content: line, epoch: Date.now() }, event);
    });
  });

  process.on('exit', (code) => {
    if (code === 0 || code === sigTermExitCode || code === null) {
      updateProcessStatus(processId, 'unknown');
      deleteProcess(processId);
      return;
    }

    updateProcessStatus(processId, 'failed');
  });
}

export async function runDekafDemoapp(connection: DekafToPulsarConnection, event: Electron.IpcMainEvent) {
  const paths = getPaths();

  const javaHome = paths.javaHome;

  let processArgs: string[] = [];
  let env: Record<string, string> = {
    "JAVA_HOME": javaHome,
  };

  if (connection.type === "local-pulsar-instance") {
    const instanceConfig = await getInstanceConfig(connection.instanceId);

    env["DEKAF_DEMOAPP_PULSAR_BROKER_URL"] = `pulsar://127.0.0.1:${instanceConfig.config.brokerServicePort}`
    env["DEKAF_DEMOAPP_PULSAR_WEB_URL"] = `http://127.0.0.1:${instanceConfig.config.webServicePort}`
  } else if (connection.type === "remote-pulsar-connection") {
    throw new Error(`Running Dekaf Demoapp isn't support for remote Pulsar connections.`);
  }

  const dekafDemoappBin = paths.dekafDemoappBin;
  const processId = uuid();

  const process = spawn(dekafDemoappBin, processArgs, { env });
  process.stdout.setEncoding('utf-8');
  process.stderr.setEncoding('utf-8');

  const newActiveProcesses: ActiveProcesses = {
    ...activeProcesses,
    [processId]: {
      status: 'starting',
      type: {
        type: "dekaf-demoapp",
        connection,
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
    (data as string).split('\n\n').forEach(line => {
      appendLog(processId, { processId, content: line, epoch: Date.now() }, event);
    });
  });

  process.stderr.on('data', (data) => {
    (data as string).split('\n\n').forEach(line => {
      appendLog(processId, { processId, content: line, epoch: Date.now() }, event);
    });
  });

  process.on('exit', (code) => {
    if (code === 0 || code === sigTermExitCode || code === null) {
      updateProcessStatus(processId, 'unknown');
      deleteProcess(processId);
      return;
    }

    updateProcessStatus(processId, 'failed');
  });
}
