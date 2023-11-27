import electron from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { apiChannel } from '../../main/preload';
import { getPaths } from './fs';
import { GetPulsarDistributionsResponse } from '../events/local-pulsar-distribution';

const distributionsDirPath = ["pulsar", "distributions"];

type PulsarVersion = "3.1.1" | "3.1.0" | "3.0.1" | "2.11.2";

type PulsarVersionInfo = {
  version: PulsarVersion,
  downloadUrl: string,
  sha512: string
};

type DownloadProgress = PulsarVersionInfo & ({
  type: "not-started"
} | {
  type: "downloading",
  percentage: number
} | {
  type: "download-error",
  message: string
});

const pulsarVersionInfos: PulsarVersionInfo[] = [{
  version: "3.1.1",
  downloadUrl: "https://www.apache.org/dyn/mirrors/mirrors.cgi?action=download&filename=pulsar/pulsar-3.1.1/apache-pulsar-3.1.1-bin.tar.gz",
  sha512: "af79f970c8835320584faf58c85bfc5cd12261f5e366c2c16bce2f7628d769ef7374a3c0e383ff443519e484a35a23e86415e0156a0f35dd3bc1f606d2fa0421"
}, {
  version: "3.1.0",
  downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-3.1.0/apache-pulsar-3.1.0-bin.tar.gz",
  sha512: "d3cc4850d31a48f218575e85419e5752e377d2900476bf63381747e307046e9beb5d44b7f45ffd1a14dc971b707824700a0192135e1a63cf0746a3061e261399"
}, {
  version: "3.0.1",
  downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-3.0.1/apache-pulsar-3.0.1-bin.tar.gz",
  sha512: "b8d8c0afe9923dbf1c3adfdbdabceb8d336f2cb0fe99d6057913f2892b34695ee266de6554b6d50ab49af54204fac1de6a67ee2b20bc2127dbade7034bf669f5"
}, {
  version: "2.11.2",
  downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.11.2/apache-pulsar-2.11.2-bin.tar.gz",
  sha512: "21f68ae8d651d2369557a80d65cca0a10eed3e72e146b51adb8107d369d57e31ba8129de7f4a343b875397d63584f1ec535ec48fd6aafc0697e33ea5118ce3e0"
}];


const downloadProgress: Partial<Record<PulsarVersion, DownloadProgress>> = {};

export async function handleGetPulsarDistributions(event: Electron.IpcMainEvent): Promise<void> {
  try {
    const paths = getPaths();
    const versions = (await fs.readdir(path.join(paths.dataDir, ...distributionsDirPath)))
      .filter(p => p.startsWith('.'));

    const res: GetPulsarDistributionsResponse = {
      type: "GetPulsarDistributionsResponse",
      status: { code: "OK" },
      versions
    }
    event.reply(apiChannel, res);
    return;
  } catch (err) {
    const res: GetPulsarDistributionsResponse = {
      type: "GetPulsarDistributionsResponse",
      status: { code: "Error", message: (err as Error).toString() }
    }
    event.reply(apiChannel, res);
    return;
  }
}

export async function handleDownloadPulsarDistribution(event: Electron.IpcMainEvent): Promise<void> {
  try {
    const paths = getPaths();
    const versions = (await fs.readdir(path.join(paths.dataDir, ...distributionsDirPath)))
      .filter(p => p.startsWith('.'));

    const res: GetPulsarDistributionsResponse = {
      type: "GetPulsarDistributionsResponse",
      status: { code: "OK" },
      versions
    }
    event.reply(apiChannel, res);
    return;
  } catch (err) {
    const res: GetPulsarDistributionsResponse = {
      type: "GetPulsarDistributionsResponse",
      status: { code: "Error", message: (err as Error).toString() }
    }
    event.reply(apiChannel, res);
    return;
  }
}
