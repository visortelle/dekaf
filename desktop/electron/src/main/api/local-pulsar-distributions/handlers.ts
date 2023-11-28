import fs, { fsync } from 'fs';
import fsAsync from 'fs/promises';
import os from 'os';
import path from 'path';
import https from 'https';
import crypto from 'node:crypto';
import tar from 'tar';
import streamAsync from 'stream/promises';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { PulsarDistributionStatus, ListPulsarDistributionsResult, KnownPulsarVersion, PulsarDistributionStatusChanged, knownPulsarVersions, AnyPulsarVersion, DownloadPulsarDistribution } from './types';
import { ErrorHappened } from '../api/types';
import { pulsarVersionInfos } from './versions';
import { sendError } from '../api/send-error';

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

    const res: ListPulsarDistributionsResult = {
      type: "ListPulsarDistributionsResult",
      versions
    }
    event.reply(apiChannel, res);

    versions.forEach(async (version) => {
      try {
        const distributionStatus = await getDistributionStatus(version);
        const res: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          distributionStatus,
          version
        }
        event.reply(apiChannel, res);
      } catch (err) {
        const errMessage = `Unable to list installed Pulsar distributions. ${err as Error}`
        const res: ErrorHappened = {
          type: "ErrorHappened",
          message: errMessage
        }
        event.reply(apiChannel, res);
        sendError(event, errMessage);
      }
    });

    return;
  } catch (err) {
    const errMessage = `Unable to list installed Pulsar distributions. ${err as Error}`;
    const res: ErrorHappened = {
      type: "ErrorHappened",
      message: errMessage
    }
    event.reply(apiChannel, res);
    sendError(event, errMessage);
    return;
  }
}

export async function handleDownloadPulsarDistribution(event: Electron.IpcMainEvent, arg: DownloadPulsarDistribution): Promise<void> {
  const tempDir = await fsAsync.mkdtemp(path.join(os.tmpdir(), `dekaf-pulsar-${arg.version}`));

  try {
    // Downloading
    const versionInfo = pulsarVersionInfos.find(v => v.version === arg.version)!;
    const url = versionInfo.downloadUrl;
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

    const uncompress = () => {
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
          C: path.join(paths.pulsarDistributionsDir, arg.version)
        })
      );

      readStream.on('error', () => {
        const errMessage = `Installing Pulsar ${arg.version} has failed during the unpacking phase.`;
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

    const req = https.get(url, res => {
      res.pipe(fs.createWriteStream(downloadedFile));

      res.on('data', (data) => {
        updateDownloadProgress(data.length);
      });

      res.on('end', async () => {
        const hash = await computeFileHash(downloadedFile, 'sha256');

        console.log('hash', hash);
        console.log('sha5', versionInfo.sha512)

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
    });

    req.on('response', (res) => {
      bytesTotal = parseInt(res.headers['content-length'] || '0', 10);
    });

    // Unpacking
    const paths = getPaths();
    const unpackDest = path.join(paths.pulsarDistributionsDir, arg.version);
  } catch (err) {
    const errMessage = `Unable to install the Pulsar distribution. ${err}`;
    const res: ErrorHappened = {
      type: "ErrorHappened",
      message: errMessage
    };
    event.reply(apiChannel, res);

    sendError(event, errMessage);
  }
}

async function computeFileHash(filepath: string, algorithm: string): Promise<string> {
  const input = fs.createReadStream(filepath);
  const hash = crypto.createHash(algorithm);
  await streamAsync.pipeline(input, hash);

  return hash.digest('hex');
}
