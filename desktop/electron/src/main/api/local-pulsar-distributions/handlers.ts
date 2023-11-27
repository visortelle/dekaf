import fs, { fsync } from 'fs';
import fsAsync from 'fs/promises';
import os from 'os';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { PulsarDistributionStatus, ListPulsarDistributionsResult, KnownPulsarVersion, PulsarDistributionStatusChanged, knownPulsarVersions, AnyPulsarVersion, DownloadPulsarDistribution } from './types';
import { ErrorHappened } from '../api/types';
import { pulsarVersionInfos } from './versions';

export async function handleListPulsarDistributions(event: Electron.IpcMainEvent): Promise<void> {
  async function getDistributionStatus(version: AnyPulsarVersion): Promise<PulsarDistributionStatus> {
    const paths = getPaths();

    let isDownloaded = true;
    try {
      await fsAsync.readdir(path.join(paths.pulsarDistributionsDir, version))
    } catch (_) {
      isDownloaded = false;
    };

    if (isDownloaded) {
      return {
        type: "downloaded",
        version
      };
    }

    return {
        type: "not-downloaded",
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
        const res: ErrorHappened = {
          type: "ErrorHappened",
          message: `Unable to list installed Pulsar distributions. ${err as Error}`
        }
        event.reply(apiChannel, res);
      }
    });

    return;
  } catch (err) {
    const res: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to list installed Pulsar distributions. ${err as Error}`
    }
    event.reply(apiChannel, res);
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
    const shasum = crypto.createHash('sha512');

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

    const req = https.get(url, res => {
      res.pipe(fs.createWriteStream(downloadedFile));

      res.on('data', (data) => {
        shasum.update(data);
        updateDownloadProgress(data.length);
      });

      res.on('end', () => {
        console.log('END!!!!!!!!!!!!!!');
        const hash = shasum.digest('hex');

        if (hash !== versionInfo.sha512) {
          const req: PulsarDistributionStatusChanged = {
            type: "PulsarDistributionStatusChanged",
            version: arg.version,
            distributionStatus: {
              type: "error",
              version: arg.version,
              message: `Unable to install Pulsar ${arg.version} distribution. Checksum verification failed.`
            }
          }
          event.reply(apiChannel, req);
        }
      });
    });

    req.on('response', (res) => {
      bytesTotal = parseInt(res.headers['content-length'] || '0', 10);
    });

    // Unpacking
    const paths = getPaths();
    const unpackDest = path.join(paths.pulsarDistributionsDir, arg.version);
  } catch (err) {
    const res: ErrorHappened = {
      type: "ErrorHappened",
      message: `Unable to install the Pulsar distribution. ${err}`
    };
    event.reply(apiChannel, res);
  }
}
