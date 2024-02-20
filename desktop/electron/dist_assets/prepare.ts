import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import fsExtra from 'fs-extra';
import { DownloaderTarget, download } from './downloader/downloader';
import { execSync } from 'node:child_process';

const graalvmArchiveName = `graalvm-bin-archive`;
const getGraalvmDownloaderTargets = ({ dest }: { dest: string }): DownloaderTarget[] => {
  const cacheDir = os.tmpdir();

  return [
    {
      taskId: graalvmArchiveName + '-darwin-x64',
      source: 'https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-21.0.2/graalvm-community-jdk-21.0.2_macos-x64_bin.tar.gz',
      dest,
      unpack: { strip: 1 },
      checksum: {
        algorithm: 'sha512',
        hash: 'b69c2c5eab8aaeb7c7c3e2a3354d43602be5ee09f5b723afb9ca56f05e276e90a315c7f95cc8d8141dc8c9092623f7c2045cd83851ba1f808335aa95136f7a50'
      },
      when: {
        platform: 'darwin',
        arch: 'x64'
      },
      cacheDir
    },
    {
      taskId: graalvmArchiveName + '-darwin-arm64',
      source: 'https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-21.0.2/graalvm-community-jdk-21.0.2_macos-aarch64_bin.tar.gz',
      dest,
      unpack: { strip: 1 },
      checksum: {
        algorithm: 'sha512',
        hash: 'b989f1f060507a2988f933b2904e3ab4605e308b579ab63ea25c7da187ba0dccc9d6734d2a66095b8759c7b9e31f2c4eea97cf953e3eb4c11ae8ea8135d5b7b5'
      },
      when: {
        platform: 'darwin',
        arch: 'arm64'
      },
      cacheDir
    },
    {
      taskId: graalvmArchiveName + '-linux-x64',
      source: 'https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-21.0.2/graalvm-community-jdk-21.0.2_linux-x64_bin.tar.gz',
      dest,
      unpack: { strip: 1 },
      checksum: {
        algorithm: 'sha512',
        hash: 'ea460b941ccd7f03009be5e7db3590149dc2c2617ade26fcfeec61d8da7b4910b5876b1887f58e322b74410b39605504b6d79ee00aa4cd4a2c278e9b7be3eeec'
      },
      when: {
        platform: 'linux',
        arch: 'x64'
      },
      cacheDir
    },
    {
      taskId: graalvmArchiveName + '-linux-arm64',
      source: 'https://download.oracle.com/graalvm/21/latest/graalvm-jdk-21_linux-aarch64_bin.tar.gz',
      dest,
      unpack: { strip: 1 },
      checksum: {
        algorithm: 'sha512',
        hash: 'e806e2565c1c6791ba6c32cdb0ce8261bb59390e5164d9256236b76d6aa45b67e89d1b36ab5dff1ea2472f90a6cf184b59a3c50df2f6d8f78c8abdd84427687f'
      },
      when: {
        platform: 'linux',
        arch: 'arm64'
      },
      cacheDir
    },
    {
      taskId: graalvmArchiveName + '-win32-x64',
      source: 'https://download.oracle.com/graalvm/21/latest/graalvm-jdk-21_windows-x64_bin.zip',
      dest,
      unpack: {
        format: 'zip',
        strip: 1
      },
      checksum: {
        algorithm: 'sha512',
        hash: '0a3f9fc5054f44d7326a4e62923290a0dd43af2a89141f3da76d70096412be06705c2c57bc60119d2ef75070bfbe2d6d13a97a95acb010adae428410f1897ed9'
      },
      when: {
        platform: 'win32',
        arch: 'x64'
      },
      cacheDir
    },
  ]
};

function getEnvoy(destDir: string) {
  fsExtra.ensureDirSync(destDir);

  const projectRoot = path.join(process.cwd(), '..', '..');
  const envoyBinRelToProjectRoot = execSync(path.join(projectRoot, 'envoy', 'getEnvoyDir.scala'), { encoding: 'utf-8' }).trim();
  const envoyBinSrc = path.resolve(projectRoot, envoyBinRelToProjectRoot).trim();

  const envoyBinDest = path.join(destDir, path.basename(envoyBinSrc));

  console.info(`Copying envoy from`, envoyBinSrc, 'to', envoyBinDest);

  fs.copyFileSync(envoyBinSrc, envoyBinDest);
}

async function prepare() {
  const platform = os.platform();
  const arch = os.arch();
  const onError = () => { console.error('Exit 1'); process.exit(1) };

  console.info('Preparing Dekaf assets.');

  const distAssetsDir = path.resolve(path.join(process.cwd(), "dist_assets"));
  console.info("Assets dir:", distAssetsDir);

  const platformDepsDir = path.resolve(path.join(distAssetsDir, "src", platform, arch));
  console.info("Platform assets dir:", platformDepsDir);

  const distAssetsOutDir = path.resolve(path.join(distAssetsDir, "build"));
  console.info("Assets out dir:", distAssetsOutDir);

  const graalvmOut = path.resolve(path.join(distAssetsOutDir, 'graalvm'));
  await Promise.all(getGraalvmDownloaderTargets({ dest: graalvmOut }).map(
    (t) => download(t, { onError })
  ));

  const dekafDist: DownloaderTarget = {
    taskId: 'dekaf-dist',
    source: 'file://' + path.resolve(path.join(process.cwd(), '../../server/target/universal/dekaf.tgz')),
    dest: path.resolve(path.join(distAssetsOutDir, './dekaf')),
    unpack: { strip: 1 }
  }
  await download(dekafDist, { onError });

  const dekafDemoappDist: DownloaderTarget = {
    taskId: 'dekaf-demoapp-dist',
    source: 'file://' + path.resolve(path.join(process.cwd(), '../../demoapp/target/universal/dekaf-demoapp.tgz')),
    dest: path.resolve(path.join(distAssetsOutDir, './dekaf-demoapp')),
    unpack: { strip: 1 }
  }
  await download(dekafDemoappDist, { onError });

  getEnvoy(path.resolve(path.join(distAssetsOutDir, 'envoy')));
}

prepare();
