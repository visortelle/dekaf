import fsAsync from 'fs/promises';
import fsExtra from 'fs-extra';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { CreateLocalPulsar, ListLocalPulsar, ListLocalPulsarsResult, LocalPulsarConfig, LocalPulsarInfo } from './types';
import { ErrorHappened } from '../api/types';
import { sendError } from '../api/send-error';

export async function handleCreateLocalPulsar(event: Electron.IpcMainEvent, arg: CreateLocalPulsar): Promise<void> {
  const paths = getPaths();
  const configFile = paths.userDataDir;
}
