import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { getPaths } from "../fs/handlers";
import { ProcessId, ProcessLogEntryReceived, ProcessStatus, ProcessStatusChanged, SpawnProcess } from "./type";
import { getInstanceConfig } from "../local-pulsar-instances/handlers";
import { v4 as uuid } from 'uuid';
import { apiChannel } from "../../channels";
import fsExtra from 'fs-extra';
import fsAsync from 'fs/promises';
import path from 'node:path';
import { ErrorHappened } from "../api/types";
import { electron } from "process";

type RunningProcess = {
  status: ProcessStatus,
  childProcess: ChildProcessWithoutNullStreams
};

const processes: Record<ProcessId, RunningProcess> = {};

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

export async function handleProcessStatusChanged(event: Electron.IpcMainEvent, arg: ProcessStatusChanged): Promise<void> {

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
  if (instanceConfig.config.brokerServicePort !== undefined) {
    standaloneConfContent = standaloneConfContent + `\n\nbrokerServicePort=${instanceConfig.config.brokerServicePort}`;
  }
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

  processes[processId] = {
    status: 'alive',
    childProcess: process
  }

  process.stdout.on('data', (data) => {
    const req: ProcessLogEntryReceived = {
      type: "ProcessLogEntryReceived",
      channel: "stdout",
      processId,
      text: data
    };
    event.reply(apiChannel, req);
  });

  process.stderr.on('data', (data) => {
    const req: ProcessLogEntryReceived = {
      type: "ProcessLogEntryReceived",
      channel: "stderr",
      processId,
      text: data
    };
    event.reply(apiChannel, req);
  });
}
