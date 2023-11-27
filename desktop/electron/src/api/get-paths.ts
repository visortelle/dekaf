import path from 'path';
import electron from 'electron';

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

export function getPaths() {
  return {
    dataDir: getDataDir(),
    configDir: getConfigDir(),
    javaHome: path.join(dataDir, `graalvm/graalvm-jdk-21.0.1+12.1/Contents/Home`),
    pulsarInstancesDir: path.join(dataDir, `pulsar/instances`),
    pulsarBin: path.join(dataDir, `pulsar/versions/3.1.1/bin/pulsar`),
    dekafBin: path.join(dataDir, `dekaf/current/bin/dekaf`)
  };
};
