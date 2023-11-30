import fsAsync from 'fs/promises';
import fsExtra from 'fs-extra';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { CreateLocalPulsarInstance, ListLocalPulsarInstances, ListLocalPulsarInstancesResult, LocalPulsarInstance, LocalPulsarInstanceInfo } from './types';
import { ErrorHappened } from '../api/types';
import { sendError } from '../api/send-error';

export async function handleCreateLocalPulsarInstance(event: Electron.IpcMainEvent, arg: CreateLocalPulsarInstance): Promise<void> {
  const paths = getPaths();
  const configFile = paths.userDataDir;
}
