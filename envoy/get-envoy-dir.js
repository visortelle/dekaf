const os = require('os');

function getEnvoyBin() {
  const arch = os.arch();
  const platform = os.platform();

  if (platform === 'darwin' && arch === 'x64') return "envoy/darwin/amd64/envoy.bin";
  if (platform === 'darwin' && arch === 'arm64') return "envoy/darwin/amd64/envoy.bin";
  if (platform === 'linux' && arch === 'x64') return "envoy/linux/amd64/envoy.bin";
  if (platform === 'linux' && arch === 'arm64') return "envoy/linux/arm64/envoy.bin";
  if (platform === 'win32' && arch === 'x64') return "envoy/windows/amd64/envoy.exe";
  throw new Error(`Unsupported OS/architecture combination: ${arch}/${platform}`);
}

console.log(getEnvoyBin());
