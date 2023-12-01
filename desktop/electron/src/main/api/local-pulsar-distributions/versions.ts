import { PulsarReleaseLine, KnownPulsarVersion } from "./types";

// {
//   version: "0.0.1-test",
//   downloadUrl: "https://github.com/bufbuild/buf/releases/download/v1.28.1/buf-Darwin-x86_64.tar.gz",
//   sha512: "77d9cef2b3274c5d8e94a01f79382f06c2814ef5ea5dc1608a0fa7d0a3915b9714b7d79c0c9db5a10b981cf47ec71955ef6c6d836cce4ed7230f0f0b08cfdfb7"
// },

export const pulsarReleaseLines: PulsarReleaseLine[] = [
  {
    minorVersion: '3.0',
    versionType: 'lts',
    releasedAt: '2023-05-02T00:00:00Z',
    activeSupportEndsAt: '2025-05-02T00:00:00Z',
    securitySupportEndsAt: '2026-05-02T00:00:00Z',
    knownVersions: [
      {
        version: "3.0.1",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-3.0.1/apache-pulsar-3.0.1-bin.tar.gz",
        sha512: "b8d8c0afe9923dbf1c3adfdbdabceb8d336f2cb0fe99d6057913f2892b34695ee266de6554b6d50ab49af54204fac1de6a67ee2b20bc2127dbade7034bf669f5"
      },
      {
        version: "3.0.0",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-3.0.0/apache-pulsar-3.0.0-bin.tar.gz",
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
        version: "3.1.1",
        downloadUrl: "https://www.apache.org/dyn/mirrors/mirrors.cgi?action=download&filename=pulsar/pulsar-3.1.1/apache-pulsar-3.1.1-bin.tar.gz",
        sha512: "af79f970c8835320584faf58c85bfc5cd12261f5e366c2c16bce2f7628d769ef7374a3c0e383ff443519e484a35a23e86415e0156a0f35dd3bc1f606d2fa0421"
      }, {
        version: "3.1.0",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-3.1.0/apache-pulsar-3.1.0-bin.tar.gz",
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
        version: "2.11.2",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.11.2/apache-pulsar-2.11.2-bin.tar.gz",
        sha512: "21f68ae8d651d2369557a80d65cca0a10eed3e72e146b51adb8107d369d57e31ba8129de7f4a343b875397d63584f1ec535ec48fd6aafc0697e33ea5118ce3e0"
      }, {
        version: "2.11.1",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.11.1/apache-pulsar-2.11.1-bin.tar.gz",
        sha512: "98eddbc150ae4b832e0f37d7793ac62b3c1ac7fb98f7460292562d91c1dd580484e23786e02efdef6fb3f50ddcf5542e94ef1761dc0d943308bbba22b221c0dc"
      }, {
        version: "2.11.0",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.11.0/apache-pulsar-2.11.0-bin.tar.gz",
        sha512: "5bf77f600ac23c7ec72696655a49801e0755d67fb4c59c7ab30e9449b061aacef61ca227f106e6b7f5f490fc2ac57412ac2af3ff064ba1e6a31c162d4ca2ba6d"
      }
    ]
  },
  {
    minorVersion: '2.10',
    versionType: 'regular',
    releasedAt: '2022-04-18T00:00:00Z',
    activeSupportEndsAt: '2023-04-18T00:00:00Z',
    securitySupportEndsAt: '2023-04-18T00:00:00Z',
    knownVersions: [
      {
        version: "2.10.4",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.10.4/apache-pulsar-2.10.4-bin.tar.gz",
        sha512: "63343005235be32e970574c9733f06cb472adfdd6511d53b91902d66c805b21cee4039b51b69013bf0f9cbcde82f4cd944c069a7d119d1c908a40716ff82eca3"
      }, {
        version: "2.10.3",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.10.3/apache-pulsar-2.10.3-bin.tar.gz",
        sha512: "64518096acf4c2a5ef1dcc936cd645217291254cd5c18337a743db5b4caa70a48cfc969643fd18a16ba24421952155b597e1b84be997447fe21f0b12a0555cb1"
      }, {
        version: "2.10.2",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.10.2/apache-pulsar-2.10.2-bin.tar.gz",
        sha512: "c136ef4f47b3b4edfb99d8a927ba70df19c12ac28d1711825bda4ef09e543d3d473ce732996244042ec3387f0e3cafdde6c8f5a0d7d18ad24429e781e65d3328"
      }, {
        version: "2.10.1",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.10.1/apache-pulsar-2.10.1-bin.tar.gz",
        sha512: "87045067cf123574b2b7d578f020efd177b0d9ff12a75d9f738e135cde35a034000c03e21cc8a264a6ef9e2b1df2c4493ffa3b9170b0f368d7424f1160df38cb"
      }, {
        version: "2.10.0",
        downloadUrl: "https://archive.apache.org/dist/pulsar/pulsar-2.10.0/apache-pulsar-2.10.0-bin.tar.gz",
        sha512: "6cc421765cb5963125b80069d49cdf1ba0c653bf278c7d124ae985976ac9cb327f4b48a9603cbfa994ee8d4e12e6b848932e819bb884ef962ce8c78db61da233"
      }
    ]
  }
];

export const knownPulsarVersions = pulsarReleaseLines.flatMap(rl => rl.knownVersions.flatMap(v => v.version));
