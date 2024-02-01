import path from 'node:path';
import os from 'node:os';
import { DownloaderTarget, download } from './downloader/downloader';

const graalvmArchiveName = `graalvm-bin-archive`;
const getGraalvmDownloaderTargets = ({ dest }: { dest: string }): DownloaderTarget[] => {
  const cacheDir = os.tmpdir();

  return [
    {
      taskId: graalvmArchiveName + '-darwin-x64',
      source: 'https://download.oracle.com/graalvm/21/latest/graalvm-jdk-21_macos-x64_bin.tar.gz',
      dest,
      unpack: { strip: 1 },
      checksum: {
        algorithm: 'sha512',
        hash: 'c4da8f6b6823f7cde16ff5261eef2278c4b03d3926ef099c419fc0a5a4b367e897a7b141c71c6f29b35769f23dc973d9f8c538addccc191ae3eb021d53ddcb9d'
      },
      when: {
        platform: 'darwin',
        arch: 'x64'
      },
      cacheDir
    },
    {
      taskId: graalvmArchiveName + '-darwin-arm64',
      source: 'https://download.oracle.com/graalvm/21/latest/graalvm-jdk-21_macos-aarch64_bin.tar.gz',
      dest,
      unpack: { strip: 1 },
      checksum: {
        algorithm: 'sha512',
        hash: 'bd4eff80d5e7b6d9915cafdf8bf3771741c01c97cb25a5b995dd15fd61ac32b02405a9f7e41e4761a581a033db57112d4dce984fcf8dc88f4ef8c4886b4387a6'
      },
      when: {
        platform: 'darwin',
        arch: 'arm64'
      },
      cacheDir
    },
    {
      taskId: graalvmArchiveName + '-linux-x64',
      source: 'https://download.oracle.com/graalvm/21/latest/graalvm-jdk-21_linux-x64_bin.tar.gz',
      dest,
      unpack: { strip: 1 },
      checksum: {
        algorithm: 'sha512',
        hash: 'e03f23115c1ee0975f7a8d61f911a5610d99f6a155b589f7672bb3ea60dda21535cd7bc37265f45175003c78dd80d9966569f10bfa5b13db0286efa9222f4175'
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
        hash: 'dcae9dd51bdfe4042f179f71fa1a815441b2580e3b6239ac0775ae3375d809f6e600e6fe89ab6f8d6059222a06d0094a0a3e091409959bfb9e40e7e3d443f478'
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
        hash: '4e2d34a25244a474907cddb3c6130c8bb4a207a3472d7a50a2b8e676d439278f309ee40948e3860d99dbd6fa6545eb3b6a48c48ab1f2d11ff07621bf73b9e062'
      },
      when: {
        platform: 'win32',
        arch: 'x64'
      },
      cacheDir
    },
  ]
};

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
}

prepare();
