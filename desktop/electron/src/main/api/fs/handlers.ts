import electron from 'electron';
import path from 'path';
import { GetPathsResponse as GetPathsResult, Paths } from './types';
import { apiChannel } from '../../channels';
import { ErrorHappened } from '../api/types';

export function handleGetPaths(event: Electron.IpcMainEvent): void {
  let paths: Paths;

  try {
    paths = getPaths();
  } catch (err) {
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: (err as Error).message
    }
    event.reply(apiChannel, req);
    return;
  }

  const req: GetPathsResult = {
    type: "GetPathsResponse",
    paths
  };
  event.reply(apiChannel, req);
}

const dataDir = "data";
const configDir = "config";

export const getDataDir = () => {
  let dir: null | string = null;
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    dir = path.resolve(process.cwd(), path.join(dataDir));
  } else {
    dir = path.resolve(path.join(electron.app.getPath("appData"), dataDir));
    console.log('getAppPath', electron.app.getAppPath());
    console.log('appData', dir)
  }

  return dir;
};

export const getConfigDir = () => {
  let dir: null | string = null;
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    dir = path.resolve(process.cwd(), path.join(configDir));
  } else {
    dir = path.resolve(path.join(electron.app.getPath("userData"), configDir));
  }

  return dir;
};

export function getPaths(): Paths {
  const pulsarDistributionsDir = path.join(dataDir, "pulsar", "distributions");
  return {
    dataDir: getDataDir(),
    configDir: getConfigDir(),
    javaHome: path.join(dataDir, `graalvm/graalvm-jdk-21.0.1+12.1/Contents/Home`),
    pulsarDistributionsDir,
    getPulsarDistributionDir: (version) => path.join(pulsarDistributionsDir, version),
    pulsarInstancesDir: path.join(dataDir, `pulsar/instances`),
    pulsarBin: path.join(dataDir, `pulsar/versions/3.1.1/bin/pulsar`),
    dekafBin: path.join(dataDir, `dekaf/current/bin/dekaf`),
  };
};
