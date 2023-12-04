import https from 'node:https';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import fsExtra from 'fs-extra';
import tar from 'tar';
import { pipeline } from 'node:stream';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import streamAsync from 'stream/promises';

export type DownloaderTarget = {
  taskId: string,
  source: string,
  dest: string,
  when?: {
    platform?: NodeJS.Platform,
    arch?: string
  },
  checksum?: {
    hash: string,
    algorithm: string
  },
  unpack?: {
    strip?: number,
    // tar by default
    format?: 'tar' | 'zip'
  },
  cacheDir?: string
};

export type DownloaderSpec = {
  files: DownloaderTarget[]
}

type Progress = {
  bytesTotal: number,
  bytesReceived: number
};
type DownloadFileProps = {
  onDownloadStart?: () => void,
  onDownloadAbortReady?: (abortDownload: () => Promise<void>) => void,
  onDownloadProgress?: (progress: Progress) => void,
  onUnpackStart?: () => void,
  onUnpackError?: (err: Error) => void,
  onUnpackFinish?: () => void,
  onChecksumError?: (err: Error) => void
  onStart?: () => void
  onError?: (err: Error) => void
};

const platform = os.platform();
const arch = os.arch();

export async function download(target: DownloaderTarget, props?: DownloadFileProps): Promise<void> {
  try {
    if (target.when !== undefined) {
      if (target.when.platform !== undefined && target.when.platform !== platform) {
        console.info(`Skipping downloading ${target.taskId}. Target platform doesn't match. ${target.when.platform} != ${platform}`);
        return;
      } else if (target.when.arch !== undefined && target.when.arch !== arch) {
        console.info(`Skipping downloading ${target.taskId}. Target arch doesn't match. ${target.when.arch} != ${arch}`);
        return;
      }
    }

    let cleanup: () => Promise<void> = async () => undefined;

    console.info(`Downloading ${target.taskId}`);

    const verifyChecksum = async (file: string) => {
      if (target.checksum === undefined) {
        return;
      }

      console.info(`Verifying checksum for ${target.taskId}`);
      const hash = await computeFileHash(file, target.checksum.algorithm);

      if (hash !== target.checksum.hash) {
        const message = `Checksum doesn't match. File: ${target.taskId}. Want ${target.checksum.hash}, got: ${hash}`;
        console.error(message);

        props?.onChecksumError === undefined ? {} : props.onChecksumError(new Error(message))
        throw new Error(`Checksum verification for ${target.taskId} failed.`);
      }
    }

    const unpack = async (sourceArchive: string, destDir: string, strip?: number) => {
      console.info(`Unpacking ${sourceArchive} to ${destDir}`);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
      }

      props?.onUnpackStart === undefined ? {} : props.onUnpackStart();

      if (target.unpack?.format === 'zip') {
        await unzipFile(sourceArchive, destDir + '/abc');
      } else {
        const readStream = fs.createReadStream(sourceArchive).pipe(tar.x({ strip, C: destDir }));

        readStream.on('error', async (err) => {
          const errorMessage = `Unpacking ${sourceArchive} to ${destDir} failed. ${err}`;
          console.info(errorMessage);

          props?.onError === undefined ? {} : props.onError(new Error(errorMessage));
          props?.onUnpackError === undefined ? {} : props.onUnpackError(new Error(errorMessage));
          await cleanup();
        });

        readStream.on('finish', async () => {
          console.info(`Unpacking ${sourceArchive} to ${destDir} finished`);
          props?.onUnpackFinish === undefined ? {} : props.onUnpackFinish();
          await cleanup();
        });
      }
    }

    const copyOrUnpack = async (file: string) => {
      if (target.unpack === undefined) {
        console.info(`Copying ${file} to ${target.dest}`);
        await fsExtra.copy(file, target.dest);
        await cleanup();
      } else {
        await fsExtra.ensureDir(target.dest);
        await unpack(file, target.dest, target.unpack.strip);
      }
    }

    if (target.cacheDir !== undefined && target.checksum !== undefined) {
      console.info(`Verifying checksum for ${target.taskId}`);
      const maybeCachedFile = path.resolve(path.join(target.cacheDir, target.checksum.hash));
      const isExists = fs.existsSync(maybeCachedFile);

      if (isExists) {
        const hash = await computeFileHash(maybeCachedFile, target.checksum.algorithm);
        if (hash === target.checksum.hash) {
          console.info(`Cached file found for ${target.taskId} as ${maybeCachedFile}. Skipping downloading.`);
          await copyOrUnpack(maybeCachedFile);
          return;
        }
      }
    }

    if (target.source.startsWith('file://')) {
      const filePath = target.source.replace('file://', '');
      const isExists = fs.existsSync(filePath);

      if (isExists) {
        await copyOrUnpack(filePath);
        return;
      }

      const errorMessage = `Downloader target source is ${target.source}. But this file doesn't exists.`;
      console.error(errorMessage);
      props?.onError === undefined ? {} : props.onError(new Error(errorMessage));
      throw new Error(errorMessage);
    }

    let bytesTotal = 0;
    let bytesReceived = 0;

    const tempDir = target.cacheDir === undefined ?
      await fsAsync.mkdtemp(path.join(os.tmpdir(), `dekaf`)) :
      target.cacheDir;

    console.info(`Created temporary directory: ${tempDir}`);

    cleanup = async () => {
      console.info(`Removing temporary directory ${tempDir}`);
      await fsExtra.remove(tempDir)
    };

    const downloadedFile = path.join(tempDir, target.checksum?.hash || target.taskId);

    const downloadStream = fs.createWriteStream(downloadedFile);
    props?.onDownloadStart === undefined ? {} : props.onDownloadStart();

    const url = await resolveUrlRedirects(target.source, 10);

    let lastPercentageReport = -1;

    const req = https.get(url, res => {
      console.info('Downloading', url, 'to', downloadedFile);
      res.pipe(downloadStream);

      res.on('data', (data) => {
        bytesReceived = bytesReceived + data.length;

        const percentage = Math.floor((bytesReceived / bytesTotal) * 100);
        if ((percentage % 5 === 0) && lastPercentageReport !== percentage) {
          lastPercentageReport = percentage;
          console.info(`${target.taskId} download progress: ${percentage}%`);
        }

        props?.onDownloadProgress === undefined ? {} : props.onDownloadProgress({ bytesReceived, bytesTotal });
      });
    });

    const abortDownload = async () => {
      console.info(`Aborting download ${target.taskId}`);

      req.destroy();
      await cleanup();
    }
    props?.onDownloadAbortReady === undefined ? {} : props.onDownloadAbortReady(abortDownload);

    req.on('response', (res) => {
      bytesTotal = parseInt(res.headers['content-length'] || '0', 10);
    });

    // Check checksum and unpack
    downloadStream.on('finish', async () => {
      await verifyChecksum(downloadedFile);
      await copyOrUnpack(downloadedFile);
    });
  } catch (err) {
    console.error(`Unknown error happened during downloading ${target.taskId}. ${err}`);
    props?.onError === undefined ? {} : props?.onError(err as Error);
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
        reject(new Error(`Request failed with status code ${res.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function unzipFile(source: string, destination: string) {
  const pipelineAsync = promisify(pipeline);
  await pipelineAsync(
    fs.createReadStream(source),
    zlib.createUnzip(),
    fs.createWriteStream(destination)
  );
}

