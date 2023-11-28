import fs from 'fs';
import fsAsync from 'fs/promises';
import fsExtra from 'fs-extra';
import os from 'os';
import path from 'path';
import https from 'https';
import crypto from 'node:crypto';
import tar from 'tar';
import streamAsync from 'stream/promises';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { PulsarDistributionStatus, ListPulsarDistributionsResult, KnownPulsarVersion, PulsarDistributionStatusChanged, knownPulsarVersions, AnyPulsarVersion, DownloadPulsarDistribution, CancelDownloadPulsarDistribution, DeletePulsarDistribution } from './types';
import { ErrorHappened } from '../api/types';
import { pulsarVersionInfos } from './versions';
import { sendError } from '../api/send-error';

const activeDownloads: Record<AnyPulsarVersion, { abortDownload: () => Promise<void> }> = {};

export async function handleListPulsarDistributions(event: Electron.IpcMainEvent): Promise<void> {
  async function getDistributionStatus(version: AnyPulsarVersion): Promise<PulsarDistributionStatus> {
    const paths = getPaths();

    let isInstalled = true;
    try {
      await fsAsync.readdir(path.join(paths.pulsarDistributionsDir, version))
    } catch (_) {
      isInstalled = false;
    };

    if (isInstalled) {
      return {
        type: "installed",
        version
      };
    }

    return {
      type: "not-installed",
      version
    };
  }

  try {
    const paths = getPaths();
    const downloadedVersions = (await fsAsync.readdir(paths.pulsarDistributionsDir))
      .filter(p => !p.startsWith('.'))

    const versions = Array.from(new Set(downloadedVersions.concat(knownPulsarVersions)));

    const req: ListPulsarDistributionsResult = {
      type: "ListPulsarDistributionsResult",
      versions
    }
    event.reply(apiChannel, req);

    versions.forEach(async (version) => {
      try {
        const distributionStatus = await getDistributionStatus(version);
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          distributionStatus,
          version
        }
        event.reply(apiChannel, req);
      } catch (err) {
        const errMessage = `Unable to list installed Pulsar distributions. ${err as Error}`
        const req: ErrorHappened = {
          type: "ErrorHappened",
          message: errMessage
        }
        event.reply(apiChannel, req);
        sendError(event, errMessage);
      }
    });

    return;
  } catch (err) {
    const errMessage = `Unable to list installed Pulsar distributions. ${err as Error}`;
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: errMessage
    }
    event.reply(apiChannel, req);
    sendError(event, errMessage);
    return;
  }
}

export async function handleDownloadPulsarDistribution(event: Electron.IpcMainEvent, arg: DownloadPulsarDistribution): Promise<void> {
  const tempDir = await fsAsync.mkdtemp(path.join(os.tmpdir(), `dekaf-pulsar-${arg.version}`));

  try {
    // Downloading
    const versionInfo = pulsarVersionInfos.find(v => v.version === arg.version)!;
    const downloadedFile = path.join(tempDir, arg.version);

    let bytesTotal = 0;
    let bytesReceived = 0;

    const updateDownloadProgress = (receivedBytes: number) => {
      bytesReceived = bytesReceived + receivedBytes;

      const req: PulsarDistributionStatusChanged = {
        type: "PulsarDistributionStatusChanged",
        version: arg.version,
        distributionStatus: {
          type: "downloading",
          version: arg.version,
          bytesReceived,
          bytesTotal
        }
      };
      event.reply(apiChannel, req);
    }

    const uncompress = async () => {
      const paths = getPaths();

      const dest = path.join(paths.pulsarDistributionsDir, arg.version);
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }

      const req: PulsarDistributionStatusChanged = {
        type: "PulsarDistributionStatusChanged",
        version: arg.version,
        distributionStatus: {
          type: "unpacking",
          version: arg.version
        }
      }
      event.reply(apiChannel, req);

      const readStream = fs.createReadStream(downloadedFile).pipe(
        tar.x({
          strip: 1,
          C: dest
        })
      );

      readStream.on('error', (err) => {
        const errMessage = `Installing Pulsar ${arg.version} has failed during the unpacking phase. ${err}`;
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version,
          distributionStatus: {
            type: "error",
            version: arg.version,
            message: errMessage
          }
        }
        event.reply(apiChannel, req);
        sendError(event, errMessage);
      });

      readStream.on('finish', () => {
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version,
          distributionStatus: {
            type: "installed",
            version: arg.version
          }
        }
        event.reply(apiChannel, req);
      });
    }

    const downloadStream = fs.createWriteStream(downloadedFile)

    const downloadingReq: PulsarDistributionStatusChanged = {
      type: "PulsarDistributionStatusChanged",
      version: arg.version,
      distributionStatus: {
        type: "downloading",
        version: arg.version,
        bytesReceived,
        bytesTotal
      }
    };
    event.reply(apiChannel, downloadingReq);

    const url = await resolveUrlRedirects(versionInfo.downloadUrl, 10);
    const req = https.get(url, res => {
      console.info('Downloading', url, 'to', downloadedFile);
      res.pipe(downloadStream);

      res.on('data', (data) => updateDownloadProgress(data.length));
    });

    const abortDownload = async () => {
      req.destroy();
      fs.rmSync(downloadedFile);
    }
    activeDownloads[arg.version] = { abortDownload };

    req.on('response', (res) => {
      bytesTotal = parseInt(res.headers['content-length'] || '0', 10);
    });

    // Check checksum and unpack
    downloadStream.on('finish', async () => {
      const hash = await computeFileHash(downloadedFile, 'sha512');

      if (hash !== versionInfo.sha512) {
        const errMessage = `Unable to install Pulsar ${arg.version} distribution. Checksum verification failed.`;
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version,
          distributionStatus: {
            type: "error",
            version: arg.version,
            message: errMessage
          }
        }
        event.reply(apiChannel, req);
        sendError(event, errMessage);

        return;
      }

      uncompress();
    });
  } catch (err) {
    const errMessage = `Unable to install the Pulsar distribution. ${err}`;
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: errMessage
    };
    event.reply(apiChannel, req);

    sendError(event, errMessage);
  }
}

export async function handleCancelDownloadPulsarDistribution(event: Electron.IpcMainEvent, arg: CancelDownloadPulsarDistribution): Promise<void> {
  try {
    await activeDownloads[arg.version]?.abortDownload();

    const req: PulsarDistributionStatusChanged = {
      type: "PulsarDistributionStatusChanged",
      version: arg.version,
      distributionStatus: {
        type: "not-installed",
        version: arg.version
      }
    };
    event.reply(apiChannel, req);
  } catch (err) {
    const errMessage = `Unable to cancel download Pulsar distribution. ${err}`;
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: errMessage
    };
    event.reply(apiChannel, req);

    sendError(event, errMessage);
  }
}


export async function handleDeletePulsarDistribution(event: Electron.IpcMainEvent, arg: DeletePulsarDistribution): Promise<void> {
  try {
    const deletingReq: PulsarDistributionStatusChanged = {
      type: "PulsarDistributionStatusChanged",
      version: arg.version,
      distributionStatus: {
        type: "deleting",
        version: arg.version
      }
    };
    event.reply(apiChannel, deletingReq);

    const paths = getPaths();
    const distributionPath = path.join(paths.pulsarDistributionsDir, arg.version);
    await fsExtra.remove(distributionPath);
    const deletedReq: PulsarDistributionStatusChanged = {
      type: "PulsarDistributionStatusChanged",
      version: arg.version,
      distributionStatus: {
        type: "not-installed",
        version: arg.version
      }
    };
    event.reply(apiChannel, deletedReq);
  } catch (err) {
    const errMessage = `Unable to delete local Pulsar distribution. ${err}`;
    const req: ErrorHappened = {
      type: "ErrorHappened",
      message: errMessage
    };
    event.reply(apiChannel, req);

    sendError(event, errMessage);
  }
}

async function computeFileHash(filepath: string, algorithm: string): Promise<string> {
  const input = fs.createReadStream(filepath);
  const hash = crypto.createHash(algorithm);
  await streamAsync.pipeline(input, hash);

  return hash.digest('hex');
}

async function resolveUrlRedirects(url: string, maxRedirects: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      reject(new Error('Too many redirects'));
      return;
    }

    https.get(url, (res) => {
      if (res.statusCode === undefined) {
        return;
      }

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(resolveUrlRedirects(res.headers.location, maxRedirects - 1));
      } else if (res.statusCode === 200) {
        resolve(url);
      } else {
        // Some other status code, reject
        reject(new Error(`Request failed with status code ${res.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}
