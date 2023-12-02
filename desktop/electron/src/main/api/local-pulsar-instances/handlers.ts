import fsAsync from 'fs/promises';
import fsExtra from 'fs-extra';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { CreateLocalPulsarInstance, DeleteLocalPulsarInstance, DeleteLocalPulsarInstanceSucceeded, UpdateLocalPulsarInstance, ListLocalPulsarInstances, ListLocalPulsarInstancesResult, LocalPulsarInstance, LocalPulsarInstanceInfo } from './types';
import { ErrorHappened } from '../api/types';

export async function handleCreateLocalPulsarInstance(event: Electron.IpcMainEvent, arg: CreateLocalPulsarInstance): Promise<void> {
  console.info(`Creating local Pulsar instance ${arg.config.id}`);

  try {
    const paths = getPaths();

    const instanceId = arg.config.id;
    const instanceDir = paths.getPulsarLocalInstanceDir(instanceId);

    await fsExtra.ensureDir(instanceDir);

    const configFilePath = paths.getPulsarLocalInstanceConfigPath(instanceId);
    const configFileContent = JSON.stringify(arg.config, null, 4);

    await fsAsync.writeFile(configFilePath, configFileContent, { encoding: 'utf-8' });
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to create a local Pulsar instance. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export async function handleUpdateLocalPulsarInstance(event: Electron.IpcMainEvent, arg: UpdateLocalPulsarInstance): Promise<void> {
  console.info(`Updating local Pulsar instance ${arg.config.id}`);

  try {
    const paths = getPaths();

    const instanceId = arg.config.id;
    const instanceDir = paths.getPulsarLocalInstanceDir(instanceId);

    await fsExtra.ensureDir(instanceDir);

    const configFilePath = paths.getPulsarLocalInstanceConfigPath(instanceId);
    const configFileContent = JSON.stringify(arg.config, null, 4);

    await fsAsync.writeFile(configFilePath, configFileContent, { encoding: 'utf-8' });
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

    const instanceIds = await fsExtra.readdir(instancesDir);

    const instanceConfigs = await Promise.all(instanceIds.map(getInstanceConfig));

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

export async function handleDeleteLocalPulsarInstance(event: Electron.IpcMainEvent, arg: DeleteLocalPulsarInstance) {
  console.info(`Deleting local Pulsar instance ${arg.instanceId}`);

  try {
    const paths = getPaths();

    const instanceDir = paths.getPulsarLocalInstanceDir(arg.instanceId);

    await fsExtra.remove(instanceDir);

    const req: DeleteLocalPulsarInstanceSucceeded = {
      type: "DeleteLocalPulsarInstanceSucceeded",
      instanceId: arg.instanceId
    }
    event.reply(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to delete the local Pulsar instance with ID ${arg.instanceId}. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export const getInstanceConfig = async (instanceId: string) => {
  const paths = getPaths();
  const configFilePath = paths.getPulsarLocalInstanceConfigPath(instanceId);
  const configFileContent = await fsAsync.readFile(configFilePath, { encoding: 'utf-8' });
  const config = JSON.parse(configFileContent) as LocalPulsarInstance;
  return config;
}
