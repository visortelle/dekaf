import { ConnectionMetadata } from "../dekaf/types";

export type StreamNativeCloudRemotePulsarConnectionFlavor = {
  type: "StreamNativeCloudRemotePulsarConnectionFlavor",
  token?: string
}

export type RemotePulsarConnectionConfig = {
  type: "RemotePulsarConnectionConfig",
  flavor?: StreamNativeCloudRemotePulsarConnectionFlavor,
  pulsarTlsKeyFilePath?: string,
  pulsarTlsCertificateFilePath?: string,
  pulsarTlsTrustCertsFilePath?: string,
  pulsarAllowTlsInsecureConnection?: boolean,
  pulsarEnableTlsHostnameVerification?: boolean,
  pulsarUseKeyStoreTls?: boolean,
  pulsarSslProvider?: string,
  pulsarTlsKeyStoreType?: string,
  pulsarTlsKeyStorePath?: string,
  pulsarTlsKeyStorePassword?: string,
  pulsarTlsTrustStoreType?: string,
  pulsarTlsTrustStorePath?: string,
  pulsarTlsTrustStorePassword?: string,
  pulsarTlsCiphers?: string[],
  pulsarTlsProtocols?: string[]
};

export type RemotePulsarConnection = {
  type: "RemotePulsarConnection",
  metadata: ConnectionMetadata,
  config: RemotePulsarConnectionConfig,
};
