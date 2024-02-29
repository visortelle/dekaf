import fs from 'node:fs';
import fsAsync from 'fs/promises';
import fsExtra from 'fs-extra';
import {apiChannel} from '../../channels';
import {getPaths} from '../fs/handlers';
import {
  CreateLocalPulsarInstance,
  DeleteLocalPulsarInstance,
  ListLocalPulsarInstances,
  ListLocalPulsarInstancesResult,
  LocalPulsarInstancesSizeRefreshed,
  LocalPulsarInstance,
  LocalPulsarInstanceCreated,
  LocalPulsarInstanceDeleted,
  LocalPulsarInstanceUpdated,
  UpdateLocalPulsarInstance, RefreshLocalPulsarInstancesSize
} from './types';
import fastFolderSize from 'fast-folder-size';
import {ErrorHappened} from '../api/types';
import {sendMessage} from '../api/send-message';
import {promisify} from "node:util";

export async function handleCreateLocalPulsarInstance(event: Electron.IpcMainEvent, arg: CreateLocalPulsarInstance): Promise<void> {
  console.info(`Creating local Pulsar instance ${arg.config.metadata.id}`);

  try {
    const paths = getPaths();

    const instanceId = arg.config.metadata.id;
    const instanceDir = paths.getPulsarLocalInstanceDir(instanceId);

    await fsExtra.ensureDir(instanceDir);

    const configFilePath = paths.getPulsarLocalInstanceConfigPath(instanceId);
    const configFileContent = JSON.stringify(arg.config, null, 4);

    await fsAsync.writeFile(configFilePath, configFileContent, { encoding: 'utf-8' });

    const req: LocalPulsarInstanceCreated = {
      type: "LocalPulsarInstanceCreated",
      instanceId: arg.config.metadata.id
    };
    sendMessage(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to create a local Pulsar instance. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export async function handleUpdateLocalPulsarInstance(event: Electron.IpcMainEvent, arg: UpdateLocalPulsarInstance): Promise<void> {
  console.info(`Updating local Pulsar instance ${arg.config.metadata.id}`);

  try {
    const paths = getPaths();

    const instanceId = arg.config.metadata.id;
    const instanceDir = paths.getPulsarLocalInstanceDir(instanceId);

    await fsExtra.ensureDir(instanceDir);

    const configFilePath = paths.getPulsarLocalInstanceConfigPath(instanceId);
    const configFileContent = JSON.stringify(arg.config, null, 4);

    await fsAsync.writeFile(configFilePath, configFileContent, { encoding: 'utf-8' });

    const req: LocalPulsarInstanceUpdated = {
      type: "LocalPulsarInstanceUpdated",
      instanceId: arg.config.metadata.id
    };
    sendMessage(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to save a local Pulsar instance. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export async function handleListLocalPulsarInstances(event: Electron.IpcMainEvent, arg: ListLocalPulsarInstances): Promise<void> {
  console.info(`Listing local Pulsar instances.`);

  try {
    const paths = getPaths();

    const instancesDir = paths.pulsarLocalInstancesDir;
    await fsExtra.ensureDir(instancesDir);

    const instanceIds = await fsExtra.readdir(instancesDir);

    const instanceConfigs: LocalPulsarInstance[] = [];
    for (let id of instanceIds) {
      // XXX - after the instance deletion, the <instance dir>/data may be not deleted because Pulsar still writes something.
      // Don't have time now to think on how to fix that in a better way.
      try {
        const config = await getInstanceConfig(id);
        instanceConfigs.push(config);
      } catch (_) {
        // do nothing
      }
    }

    const req: ListLocalPulsarInstancesResult = {
      type: "ListLocalPulsarInstancesResult",
      configs: instanceConfigs
    };

    event.reply(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to list local Pulsar instances. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export async function handleRefreshLocalPulsarInstancesSize(event: Electron.IpcMainEvent, arg: RefreshLocalPulsarInstancesSize) {
  const paths = getPaths();

  const instancesDir = paths.pulsarLocalInstancesDir;
  await fsExtra.ensureDir(instancesDir);

  const instanceIds = await fsExtra.readdir(instancesDir);

  const instancesSizeMap: Map<string, number | undefined> = new Map<string, number | undefined>();

  for (let id of instanceIds) {
    // XXX - after the instance deletion, the <instance dir>/data may be not deleted because Pulsar still writes something.
    // Don't have time now to think on how to fix that in a better way.
    try {
      const instanceDir = paths.getPulsarLocalInstanceDir(id);

      const fastFolderSizeAsync = promisify(fastFolderSize);
      const size = await fastFolderSizeAsync(instanceDir);

      instancesSizeMap.set(id, size);
    } catch (_) {
      // do nothing
    }
  }

  const req: LocalPulsarInstancesSizeRefreshed = {
    type: "LocalPulsarInstancesSizeRefreshed",
    instancesSizeMap: instancesSizeMap
  };

  event.reply(apiChannel, req);
}

export async function handleDeleteLocalPulsarInstance(event: Electron.IpcMainEvent, arg: DeleteLocalPulsarInstance) {
  console.info(`Deleting local Pulsar instance ${arg.instanceId}`);

  try {
    const paths = getPaths();

    const instanceDir = paths.getPulsarLocalInstanceDir(arg.instanceId);
    await fsExtra.remove(instanceDir);

    const dekafDataDir = paths.getPulsarLocalInstanceDekafDataDir(arg.instanceId);
    await fsExtra.remove(dekafDataDir);

    const req: LocalPulsarInstanceDeleted = {
      type: "LocalPulsarInstanceDeleted",
      instanceId: arg.instanceId
    };
    sendMessage(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to delete the local Pulsar instance with ID ${arg.instanceId}. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export const getInstanceConfig = async (instanceId: string): Promise<LocalPulsarInstance> => {
  const paths = getPaths();
  const configFilePath = paths.getPulsarLocalInstanceConfigPath(instanceId);
  const instanceDir = paths.getPulsarLocalInstanceDir(instanceId);

  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Pulsar instance dir exists, but config file isn't found: ${instanceId}`);
  }

  const configFileContent = await fsAsync.readFile(configFilePath, { encoding: 'utf-8' });
  const config = JSON.parse(configFileContent) as LocalPulsarInstance;

  const fastFolderSizeAsync = promisify(fastFolderSize);
  const size = await fastFolderSizeAsync(instanceDir);

  console.log(`Pulsar instance ${instanceDir} size: ${size} bytes`);

  config.size = size;

  return config;
}
