import { PulsarReleaseLine, KnownPulsarVersion } from "./types";

export const pulsarReleaseLines: PulsarReleaseLine[] = [
  {
    minorVersion: '3.0',
    versionType: 'lts',
    releasedAt: '2023-05-02T00:00:00Z',
    activeSupportEndsAt: '2025-05-02T00:00:00Z',
    securitySupportEndsAt: '2026-05-02T00:00:00Z',
    knownVersions: [
      // {
      //   version: "0.0.1-test",
      //   downloadUrl: "https://github.com/bufbuild/buf/releases/download/v1.28.1/buf-Darwin-x86_64.tar.gz",
      //   sha512: "77d9cef2b3274c5d8e94a01f79382f06c2814ef5ea5dc1608a0fa7d0a3915b9714b7d79c0c9db5a10b981cf47ec71955ef6c6d836cce4ed7230f0f0b08cfdfb7"
      // },
      {
        version: "3.0.2",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-3.0.2-bin.tar.gz",
        sha512: "b3421eb57233638e4d8305b040b1ffd1374b9ddfa55ea1a1043dc9be78ed89f72604cf249fcf5e663f1e3e1be86daf36991ee069ea1eb146f384c374484da0ff"
      },
      {
        version: "3.0.1",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-3.0.1-bin.tar.gz",
        sha512: "b8d8c0afe9923dbf1c3adfdbdabceb8d336f2cb0fe99d6057913f2892b34695ee266de6554b6d50ab49af54204fac1de6a67ee2b20bc2127dbade7034bf669f5"
      },
      {
        version: "3.0.0",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-3.0.0-bin.tar.gz",
        sha512: "7c74599ff52606c34c7123619beee37eb89f86a1f78daeb827915fd2275d976aa05469914b7485a3f4c2f67f663f397677c25be615dded386f896c1dbf32ea29"
      }
    ]
  },
  {
    minorVersion: '3.1',
    versionType: 'regular',
    releasedAt: '2023-08-10T00:00:00Z',
    activeSupportEndsAt: '2024-02-10T00:00:00Z',
    securitySupportEndsAt: '2024-02-10T00:00:00Z',
    knownVersions: [
      {
        version: "3.1.2",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-3.1.2-bin.tar.gz",
        sha512: "48e2d0069cd69c6f2bf5b5d5aa9fbc775436d3e160bd51645a6626fb86706ddba4901a5d6b87e29a57b9f19c0d0b8c22aef2dfa3d3525260ccccad55d0a39db6"
      },
      {
        version: "3.1.1",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-3.1.1-bin.tar.gz",
        sha512: "af79f970c8835320584faf58c85bfc5cd12261f5e366c2c16bce2f7628d769ef7374a3c0e383ff443519e484a35a23e86415e0156a0f35dd3bc1f606d2fa0421"
      }, {
        version: "3.1.0",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-3.1.0-bin.tar.gz",
        sha512: "d3cc4850d31a48f218575e85419e5752e377d2900476bf63381747e307046e9beb5d44b7f45ffd1a14dc971b707824700a0192135e1a63cf0746a3061e261399"
      }
    ]
  },
  {
    minorVersion: '2.11',
    versionType: 'regular',
    releasedAt: '2023-01-11T00:00:00Z',
    activeSupportEndsAt: '2024-01-11T00:00:00Z',
    securitySupportEndsAt: '2024-01-11T00:00:00Z',
    knownVersions: [
      {
        version: "2.11.3",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-2.11.3-bin.tar.gz",
        sha512: "4510c16d6ec90847eb8dff0246bd09190f99bc10a30702ab5f521971b13b6cffe0f9d1de9637b85340154ee38764a39551fd871bd1132d7760fb3a7e931a20e3"
      },
      {
        version: "2.11.2",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-2.11.2-bin.tar.gz",
        sha512: "21f68ae8d651d2369557a80d65cca0a10eed3e72e146b51adb8107d369d57e31ba8129de7f4a343b875397d63584f1ec535ec48fd6aafc0697e33ea5118ce3e0"
      }, {
        version: "2.11.1",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-2.11.1-bin.tar.gz",
        sha512: "98eddbc150ae4b832e0f37d7793ac62b3c1ac7fb98f7460292562d91c1dd580484e23786e02efdef6fb3f50ddcf5542e94ef1761dc0d943308bbba22b221c0dc"
      }, {
        version: "2.11.0",
        downloadUrl: "https://apache-pulsar-releases.s3.us-east-2.amazonaws.com/apache-pulsar-2.11.0-bin.tar.gz",
        sha512: "5bf77f600ac23c7ec72696655a49801e0755d67fb4c59c7ab30e9449b061aacef61ca227f106e6b7f5f490fc2ac57412ac2af3ff064ba1e6a31c162d4ca2ba6d"
      }
    ]
  }
];

export const knownPulsarVersions = pulsarReleaseLines.flatMap(rl => rl.knownVersions.flatMap(v => v.version));
