import { Credentials } from "../../../renderer/RemotePulsarConnectionEditor/pulsar-auth/domain";
import { ConnectionMetadata } from "../dekaf/types";

export type StreamNativeCloudRemotePulsarConnectionFlavor = {
  type: "StreamNativeCloudRemotePulsarConnectionFlavor",
  token?: string
}

export type RemotePulsarConnectionConfig = {
  type: "RemotePulsarConnectionConfig",
  pulsarBrokerUrl: string,
  pulsarWebUrl: string,
  flavor?: StreamNativeCloudRemotePulsarConnectionFlavor,
  auth?: Credentials,
  pulsarListenerName?: string,
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
  pulsarTlsCiphers?: string,
  pulsarTlsProtocols?: string
};

export type RemotePulsarConnection = {
  type: "RemotePulsarConnection",
  metadata: ConnectionMetadata,
  config: RemotePulsarConnectionConfig,
};

export type CreateRemotePulsarConnection = {
  type: "CreateRemotePulsarConnection",
  config: RemotePulsarConnection
};

export type RemotePulsarConnectionCreated = {
  type: "RemotePulsarConnectionCreated",
  connectionId: string
}

export type UpdateRemotePulsarConnection = {
  type: "UpdateRemotePulsarConnection",
  config: RemotePulsarConnection
};

export type RemotePulsarConnectionUpdated = {
  type: "RemotePulsarConnectionUpdated",
  connectionId: string
}

export type DeleteRemotePulsarConnection = {
  type: "DeleteRemotePulsarConnection",
  connectionId: string
}

export type RemotePulsarConnectionDeleted = {
  type: "RemotePulsarConnectionDeleted",
  connectionId: string
}

export type ListRemotePulsarConnections = {
  type: "ListRemotePulsarConnections"
};

export type ListRemotePulsarConnectionsResult = {
  type: "ListRemotePulsarConnectionsResult",
  configs: RemotePulsarConnection[]
}
