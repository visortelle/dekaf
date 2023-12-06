import { ConnectionMetadata } from "../dekaf/types";

export type RemotePulsarConnectionFlavor = {
  type: "RemotePulsarConnectionFlavor",
  flavor: "Default" | "StreamNativeCloud"
};

export type RemotePulsarConnectionConfig = {
  type: "RemotePulsarConnectionConfig",
  flavor: RemotePulsarConnectionFlavor,
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
