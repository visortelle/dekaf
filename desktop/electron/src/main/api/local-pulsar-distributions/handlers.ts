import fs from 'fs';
import fsAsync from 'fs/promises';
import os from 'os';
import path from 'path';
import https from 'https';
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
  try {
    // Downloading
    const url = pulsarVersionInfos.find(v => v.version === arg.version)?.downloadUrl!;
    const tempDir = await fsAsync.mkdtemp(path.join(os.tmpdir(), `dekaf-pulsar-${arg.version}`));
    const out = path.join(tempDir, arg.version);

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

    const req = https.get(url, res => {
      res.pipe(fs.createWriteStream(out));

      res.on('data', (res) => {
        updateDownloadProgress(res.length);
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
