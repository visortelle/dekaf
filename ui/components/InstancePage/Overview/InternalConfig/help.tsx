import {ColumnKey} from "./InternalConfig";
import {ReactNode} from "react";

export const help: Record<ColumnKey, ReactNode> = {
  bookkeeperMetadataServiceUri: <div>Configuration that used to define the metadata service URI of the BookKeeper cluster. This configuration is essential for allowing multiple Pulsar clusters to share the same BookKeeper cluster. </div>,
  configurationStoreServers: <div><strong>Deprecated.</strong><br/>Configuration store connection string (as a comma-separated list). Use <code>configurationMetadataStoreUrl</code> instead.</div>,
  stateStorageServiceUrl: <div>The service url pointing to Bookkeeper table service.</div>,
  zookeeperServers: <div>Zookeeper quorum connection string.</div>,
}
