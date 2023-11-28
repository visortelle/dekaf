import https from 'node:https';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import fsExtra from 'fs-extra';
import tar from 'tar';
import crypto from 'node:crypto';
import streamAsync from 'stream/promises';

type DownloaderTarget = {
  name: string,
  source: string,
  dest: string,
  when?: {
    platform: string,
    arch: string
  },
  checksum?: {
    hash: string,
    algorithm: string
  },
  unpack?: {
    strip?: number
  }
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
export async function download(file: DownloaderTarget, props?: DownloadFileProps): Promise<void> {
  try {
    let bytesTotal = 0;
    let bytesReceived = 0;

    const tempDir = await fsAsync.mkdtemp(path.join(os.tmpdir(), `dekaf`));
    console.info(`Created temporary directory: ${tempDir}`);

    const cleanup = async () => {
      console.info(`Removing temporary directory ${tempDir}`);
      await fsExtra.remove(tempDir)
    };

    const downloadedFile = path.join(tempDir, file.name);

    const unpack = async (archivePath: string, destDir: string, strip?: number) => {
      console.info(`Unpacking ${archivePath} to ${destDir}`);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
      }

      props?.onUnpackStart === undefined ? {} : props.onUnpackStart();

      const readStream = fs.createReadStream(archivePath).pipe(
        tar.x({
          strip,
          C: destDir
        })
      );

      readStream.on('error', async (err) => {
        console.info(`Unpacking ${archivePath} to ${destDir} failed`);
        props?.onUnpackError === undefined ? {} : props.onUnpackError(err);
        await cleanup();
      });

      readStream.on('finish', async () => {
        console.info(`Unpacking ${archivePath} to ${destDir} finished`);
        props?.onUnpackFinish === undefined ? {} : props.onUnpackFinish();
        await cleanup();
      });
    }

    const downloadStream = fs.createWriteStream(downloadedFile);

    props?.onDownloadStart === undefined ? {} : props.onDownloadStart();

    const url = await resolveUrlRedirects(file.source, 10);
    const req = https.get(url, res => {
      console.info('Downloading', url, 'to', downloadedFile);
      res.pipe(downloadStream);

      res.on('data', (data) => {
        bytesReceived = bytesReceived + data.length;
        props?.onDownloadProgress === undefined ? {} : props.onDownloadProgress({ bytesReceived, bytesTotal });
      });
    });

    const abortDownload = async () => {
      console.info(`Aborting download ${file.name}`);

      req.destroy();
      await cleanup();
    }
    props?.onDownloadAbortReady === undefined ? {} : props.onDownloadAbortReady(abortDownload);

    req.on('response', (res) => {
      bytesTotal = parseInt(res.headers['content-length'] || '0', 10);
    });

    // Check checksum and unpack
    downloadStream.on('finish', async () => {
      if (file.checksum !== undefined) {
        console.info(`Verifying checksum for ${downloadedFile}`);
        const hash = await computeFileHash(downloadedFile, file.checksum.algorithm);

        if (hash !== file.checksum.hash) {
          console.error(`Checksum verification for ${downloadedFile} failed.`);
          props?.onChecksumError === undefined ? {} : props.onChecksumError(new Error(`Checksum doesn't match. File: ${file.name}`))
          return;
        }
      }

      if (file.unpack === undefined) {
        console.info(`Copying ${downloadedFile} to ${file.dest}`);
        await fsAsync.rename(downloadedFile, file.dest);
        await cleanup();
      } else {
        await fsExtra.ensureDir(file.dest);
        await unpack(downloadedFile, file.dest, file.unpack.strip);
      }
    });
  } catch (err) {
    console.error(`Unknown error happened during downloading ${file.name}`);
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
        // Some other status code, reject
        reject(new Error(`Request failed with status code ${res.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}
