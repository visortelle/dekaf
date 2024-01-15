import fsAsync from 'fs/promises';
import fsExtra from 'fs-extra';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { CreateRemotePulsarConnection, DeleteRemotePulsarConnection, ListRemotePulsarConnections, ListRemotePulsarConnectionsResult, RemotePulsarConnection, RemotePulsarConnectionConfig, RemotePulsarConnectionCreated, RemotePulsarConnectionDeleted, RemotePulsarConnectionUpdated, StreamNativeCloudRemotePulsarConnectionFlavor, UpdateRemotePulsarConnection } from './types';
import { ErrorHappened } from '../api/types';
import { sendMessage } from '../api/send-message';

export async function handleCreateRemotePulsarConnection(event: Electron.IpcMainEvent, arg: CreateRemotePulsarConnection): Promise<void> {
  console.info(`Creating remote Pulsar connection ${arg.config.metadata.id}`);

  try {
    const paths = getPaths();

    const connectionId = arg.config.metadata.id;
    const connectionDir = paths.getRemotePulsarConnectionDir(connectionId);

    await fsExtra.ensureDir(connectionDir);

    const configFilePath = paths.getRemotePulsarConnectionConfigPath(connectionId);
    const configFileContent = JSON.stringify(arg.config, null, 4);

    await fsAsync.writeFile(configFilePath, configFileContent, { encoding: 'utf-8' });

    const req: RemotePulsarConnectionCreated = {
      type: "RemotePulsarConnectionCreated",
      connectionId: arg.config.metadata.id
    };
    sendMessage(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to create a remote Pulsar connection. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export async function handleUpdateRemotePulsarConnection(event: Electron.IpcMainEvent, arg: UpdateRemotePulsarConnection): Promise<void> {
  console.info(`Updating remote Pulsar connection ${arg.config.metadata.id}`);

  try {
    const paths = getPaths();

    const connectionId = arg.config.metadata.id;
    const connectionDir = paths.getRemotePulsarConnectionDir(connectionId);

    await fsExtra.ensureDir(connectionDir);

    const configFilePath = paths.getRemotePulsarConnectionConfigPath(connectionId);
    const configFileContent = JSON.stringify(arg.config, null, 4);

    await fsAsync.writeFile(configFilePath, configFileContent, { encoding: 'utf-8' });

    const req: RemotePulsarConnectionUpdated = {
      type: "RemotePulsarConnectionUpdated",
      connectionId: arg.config.metadata.id
    };
    sendMessage(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to save a remote Pulsar connection. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export async function handleListRemotePulsarConnections(event: Electron.IpcMainEvent, arg: ListRemotePulsarConnections): Promise<void> {
  console.info(`Listing remote Pulsar connections.`);

  try {
    const paths = getPaths();

    const connectionsDir = paths.remotePulsarConnectionsDir;
    await fsExtra.ensureDir(connectionsDir);

    const connectionIds = await fsExtra.readdir(connectionsDir);

    const connectionConfigs = await Promise.all(connectionIds.map(getConnectionConfig));

    const req: ListRemotePulsarConnectionsResult = {
      type: "ListRemotePulsarConnectionsResult",
      configs: connectionConfigs
    };

    event.reply(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to list remote Pulsar connections. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export async function handleDeleteRemotePulsarConnection(event: Electron.IpcMainEvent, arg: DeleteRemotePulsarConnection) {
  console.info(`Deleting remote Pulsar connection ${arg.connectionId}`);

  try {
    const paths = getPaths();

    const connectionDir = paths.getRemotePulsarConnectionDir(arg.connectionId);
    await fsExtra.remove(connectionDir);

    const dekafDataDir = paths.getRemoteConnectionDekafDataDir(arg.connectionId);
    await fsExtra.remove(dekafDataDir);

    const req: RemotePulsarConnectionDeleted = {
      type: "RemotePulsarConnectionDeleted",
      connectionId: arg.connectionId
    };
    sendMessage(apiChannel, req);
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to delete the remote Pulsar connection with ID ${arg.connectionId}. ${err}`
    };

    event.reply(apiChannel, req);
  }
}

export const getConnectionConfig = async (connectionId: string): Promise<RemotePulsarConnection> => {
  const paths = getPaths();
  const configFilePath = paths.getRemotePulsarConnectionConfigPath(connectionId);
  const configFileContent = await fsAsync.readFile(configFilePath, { encoding: 'utf-8' });
  const config = JSON.parse(configFileContent) as RemotePulsarConnection;
  return config;
}
