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

export const getUserDataDir = () => {
  let dir: null | string = null;
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    dir = path.resolve(process.cwd(), path.join("user-data"));
  } else {
    dir = path.resolve(path.join(electron.app.getPath("userData")));
  }

  return dir;
};

export const getAssetsDir = () => {
  let dir: null | string = null;
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    dir = path.resolve(process.cwd(), path.join("dist_assets", "build"));
  } else {
    dir = path.resolve(path.join(electron.app.getAppPath(), "dist_assets"));
  }

  return dir;
};

export function getPaths(): Paths {
  const appPath = electron.app.getAppPath();
  const assetsDir = getAssetsDir();
  const userDataDir = getUserDataDir();
  const pulsarDistributionsDir = path.resolve(path.join(userDataDir, "pulsar", "distributions"));
  const getPulsarDistributionDir = (version: string) => path.resolve(path.join(pulsarDistributionsDir, version))
  const getPulsarBin = (version: string) => path.resolve(path.join(getPulsarDistributionDir(version), 'bin', 'pulsar'))

  return {
    appPath,
    assetsDir,
    userDataDir,
    javaHome: path.resolve(path.join(assetsDir, 'graalvm', 'Contents', 'Home')),
    pulsarDistributionsDir,
    getPulsarDistributionDir,
    getPulsarBin,
    pulsarLocalInstancesDir: path.resolve(path.join(userDataDir, 'pulsar', 'instances')),
    dekafBin: path.resolve(path.join(assetsDir, 'dekaf', 'bin', 'dekaf')),
  };
};
