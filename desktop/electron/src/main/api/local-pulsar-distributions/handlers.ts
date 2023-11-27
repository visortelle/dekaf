import fs from 'fs/promises';
import path from 'path';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { PulsarDistributionStatus, ListPulsarDistributionsResult, KnownPulsarVersion, PulsarDistributionStatusChanged, knownPulsarVersions, AnyPulsarVersion } from './types';
import { ErrorHappened } from '../api/types';

const distributionsDirPath = ["pulsar", "distributions"];
const downloadingState: Partial<Record<AnyPulsarVersion, PulsarDistributionStatus>> = {};

export async function handleListPulsarDistributionsRequest(event: Electron.IpcMainEvent): Promise<void> {
  async function getDistributionStatus(version: AnyPulsarVersion): Promise<PulsarDistributionStatus> {
    if (downloadingState[version]) {
      return downloadingState[version]!;
    }

    return {
      type: "downloaded",
      version
    };
  }

  try {
    const paths = getPaths();
    const downloadedVersions = (await fs.readdir(path.join(paths.dataDir, ...distributionsDirPath)))
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
          pulsarVersion: version
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

export async function handleDownloadPulsarDistribution(event: Electron.IpcMainEvent): Promise<void> {
  // try {
  //   const paths = getPaths();
  //   const versions = (await fs.readdir(path.join(paths.dataDir, ...distributionsDirPath)))
  //     .filter(p => p.startsWith('.'));

  //   const res: ListPulsarDistributionsResult = {
  //     type: "ListPulsarDistributionsResponse",
  //     status: { code: "OK" },
  //     versions
  //   }
  //   event.reply(apiChannel, res);
  //   return;
  // } catch (err) {
  //   const res: ListPulsarDistributionsResponse = {
  //     type: "ListPulsarDistributionsResponse",
  //     status: { code: "Error", message: (err as Error).toString() }
  //   }
  //   event.reply(apiChannel, res);
  //   return;
  // }
}
