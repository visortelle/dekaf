import {ReactNode} from "react";
import {ColumnKey} from "./Cluster";

export const help: Record<ColumnKey, ReactNode> = {
  clusterName: <div>Name of the Pulsar cluster</div>,
  serviceUrl: <div>HTTP server URL that exposes a REST API for both administrative tasks and topic lookup for producers and consumers.</div>,
  serviceUrlTsl: <div>The same as Service URL but establishes a secure connection, utilizing TLS encryption.</div>,
  brokerServiceUrl: <div>An asynchronous TCP server URL used for all data transfers in and out of a Pulsar broker.<br/> Uses a custom binary protocol for all communications.</div>,
  brokerServiceUrlTsl: <div>The same as Broker Service URL but establishes a secure connection, utilizing TLS encryption. </div>,
  proxyServiceUrl: <div>URL of proxy service.<code>proxyServiceUrl</code> and <code>proxyProtocol</code> must be mutually inclusive.</div>,
  proxyProtocol: <div>Protocol of proxy service.<code>proxyServiceUrl</code> and <code>proxyProtocol</code> must be mutually inclusive.</div>,
  peerClusterNames: <div>Identifiers for the cluster in the network of clusters. They are used to identify and establish connections with other swpeer clusters in the network.</div>,
  authenticationPlugin: <div>Authentication settings of the broker itself. Used when the broker connects to other brokers, either in same or other clusters. Default uses plugin which disables authentication</div>,
  authenticationParameters: <div>Authentication parameters of the authentication plugin the broker is using to connect to other brokers.</div>,
  isBrokerClientTlsEnabled: <div>Enable TLS when talking with other brokers in the same cluster (admin operation) or different clusters (replication)</div>,
  isTlsAllowInsecureConnection: <div>Controls whether the client will accept TLS certificates from the broker that are not trusted.</div>,
  isBrokerClientTlsEnabledWithKeyStore: <div>Signifies if the internal client(refers to a component of the Pulsar system) utilizes the KeyStore type for authentication with other Pulsar brokers.</div>,
  brokerClientTlsTrustStoreType: <div>Specifically used for broker-client communication. Indicates the type of the TrustStore used for establishing secure TLS connections with clients.</div>,
  brokerClientTrustCertsFilePath: <div>Path to the trusted TLS certificate file.</div>,
  listenerName: <div>Serves a specific purpose in the lookup process. <code>listenerName</code> allows clients to select one of the listeners as the service URL, which is then used to establish a connection to the broker, assuming the network is accessible.<code>advertisedListeners</code> must be activated on the broker side.</div>
}
