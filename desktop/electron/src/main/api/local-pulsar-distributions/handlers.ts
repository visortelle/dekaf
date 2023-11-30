import fsAsync from 'fs/promises';
import fsExtra from 'fs-extra';
import { apiChannel } from '../../channels';
import { getPaths } from '../fs/handlers';
import { PulsarDistributionStatus, ListPulsarDistributionsResult, PulsarDistributionStatusChanged, AnyPulsarVersion, DownloadPulsarDistribution, CancelDownloadPulsarDistribution, DeletePulsarDistribution, ListPulsarDistributions, PulsarDistributionDeleted } from './types';
import { ErrorHappened } from '../api/types';
import { pulsarReleaseLines } from './versions';
import { sendError } from '../api/send-error';
import { download } from '../../../../dist_assets/downloader/downloader';

const activeDownloads: Record<AnyPulsarVersion, { abortDownload: () => Promise<void> }> = {};

const knownPulsarDistributions = pulsarReleaseLines.flatMap(v => v.knownVersions);

export async function handleListPulsarDistributions(event: Electron.IpcMainEvent): Promise<void> {
  async function getDistributionStatus(version: AnyPulsarVersion): Promise<PulsarDistributionStatus> {
    const paths = getPaths();

    let isInstalled = true;
    try {
      await fsAsync.readdir(paths.getPulsarDistributionDir(version))
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
    const isDistributionsDirExits = await fsAsync.stat(paths.pulsarDistributionsDir).catch(() => undefined);
    const downloadedVersions = isDistributionsDirExits ?
      (await fsAsync.readdir(paths.pulsarDistributionsDir)).filter(p => !p.startsWith('.'))
      : []

    const versions = Array.from(new Set(downloadedVersions.concat(knownPulsarDistributions.flatMap(d => d.version))));

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
  let lastDownloadProgressUpdate = Date.now();

  try {
    const versionInfo = knownPulsarDistributions.find(v => v.version === arg.version.version)!;
    const paths = getPaths();

    await download({
      taskId: arg.version.version,
      dest: paths.getPulsarDistributionDir(arg.version.version),
      source: versionInfo.downloadUrl,
      checksum: {
        hash: versionInfo.sha512,
        algorithm: 'sha512'
      },
      unpack: {
        strip: 1
      }
    }, {
      onDownloadStart: () => {
        const downloadingReq: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version.version,
          distributionStatus: {
            type: "downloading",
            version: arg.version.version,
            bytesReceived: 0,
            bytesTotal: 0
          }
        };
        event.reply(apiChannel, downloadingReq);
      },
      onDownloadProgress: ({ bytesReceived, bytesTotal }) => {
        if ((Date.now() - lastDownloadProgressUpdate) < 100) {
          // Avoid too frequent updates.
          return;
        }

        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version.version,
          distributionStatus: {
            type: "downloading",
            version: arg.version.version,
            bytesReceived,
            bytesTotal
          }
        };
        event.reply(apiChannel, req);
        lastDownloadProgressUpdate = Date.now();
      },
      onDownloadAbortReady(abortDownload) {
        activeDownloads[arg.version.version] = { abortDownload };
      },
      onUnpackStart: () => {
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version.version,
          distributionStatus: {
            type: "unpacking",
            version: arg.version.version
          }
        }
        event.reply(apiChannel, req);
      },
      onUnpackError: (err) => {
        const errMessage = `Installing Pulsar ${arg.version} has failed during the unpacking phase. ${err}`;
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version.version,
          distributionStatus: {
            type: "error",
            version: arg.version.version,
            message: errMessage
          }
        }
        event.reply(apiChannel, req);
        sendError(event, errMessage);
      },
      onChecksumError: (err) => {
        const message = `Unable to install Pulsar ${arg.version} distribution. ${err}`;
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version.version,
          distributionStatus: {
            type: "error",
            version: arg.version.version,
            message
          }
        }
        event.reply(apiChannel, req);
        sendError(event, message);
      },
      onUnpackFinish: () => {
        const req: PulsarDistributionStatusChanged = {
          type: "PulsarDistributionStatusChanged",
          version: arg.version.version,
          distributionStatus: {
            type: "installed",
            version: arg.version.version
          }
        }
        event.reply(apiChannel, req);
      },
      onError: (err) => {
        const errMessage = `Unable to install the Pulsar distribution. ${err}`;
        const req: ErrorHappened = {
          type: "ErrorHappened",
          message: errMessage
        };
        event.reply(apiChannel, req);

        sendError(event, errMessage);
      }
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
    const distributionPath = paths.getPulsarDistributionDir(arg.version);
    await fsExtra.remove(distributionPath);

    const deletedReq: PulsarDistributionDeleted = { type: "PulsarDistributionDeleted", version: arg.version };
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
