import React from "react";
import s from "./Cluster.module.css";
import sts from "../../../../ui/SimpleTable/SimpleTable.module.css";
import * as Notifications from "../../../../app/contexts/Notifications";
import * as GrpcClient from "../../../../app/contexts/GrpcClient/GrpcClient";
import * as pb from "../../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import { Code } from "../../../../../grpc-web/google/rpc/code_pb";
import { swrKeys } from "../../../../swrKeys";
import useSWR from "swr";

export type ClusterProps = {
  cluster: string;
};

const Cluster: React.FC<ClusterProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { clustersServiceClient } = GrpcClient.useContext();

  const { data: cluster, error: clusterError } = useSWR(
    swrKeys.pulsar.clusters.cluster._({ cluster: props.cluster }),
    async () => {
      const req = new pb.GetClusterRequest();
      req.setCluster(props.cluster);

      const res = await clustersServiceClient.getCluster(req, null);

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(
          `Unable to get cluster info. ${res.getStatus()?.getMessage()}`
        );
        return undefined;
      }

      return res.getClusterData();
    }
  );

  if (clusterError) {
    notifyError(`Unable to get cluster info. ${clusterError}`);
  }

  if (cluster === undefined) {
    return null;
  }

  return (
    <div className={s.Cluster}>
      <table className={sts.Table}>
        <tbody>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Cluster Name</td>
            <td className={sts.Cell}>{props.cluster}</td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Service URL</td>
            <td className={sts.Cell}>
              {cluster.getServiceUrl()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Service URL TLS</td>
            <td className={sts.Cell}>
              {cluster.getServiceUrlTls()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Broker Service URL</td>
            <td className={sts.Cell}>
              {cluster.getBrokerServiceUrl()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Broker Service URL TLS</td>
            <td className={sts.Cell}>
              {cluster.getBrokerServiceUrlTls()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Proxy Service URL</td>
            <td className={sts.Cell}>
              {cluster.getProxyServiceUrl()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Proxy Protocol</td>
            <td className={sts.Cell}>
              {proxyProtocolPbToString(cluster.getProxyProtocol()) || (
                <NoData />
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Peer Cluster Names</td>
            <td className={sts.Cell}>
              {cluster.getPeerClusterNamesList().length === 0 ? (
                <NoData />
              ) : (
                cluster
                  .getPeerClusterNamesList()
                  .map((peerClusterName) => <code>{peerClusterName}</code>)
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Authentication Plugin</td>
            <td className={sts.Cell}>
              {cluster.getAuthenticationPlugin()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Authentication Parameters</td>
            <td className={sts.Cell}>
              {cluster.getAuthenticationParameters()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Is Broker Client TLS Enabled</td>
            <td className={sts.Cell}>
              {cluster.getIsBrokerClientTlsEnabled()?.getValue() ===
                undefined ? (
                <NoData />
              ) : cluster.getIsBrokerClientTlsEnabled()?.getValue() === true ? (
                "true"
              ) : (
                "false"
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Is TLS Allow Insecure Connection</td>
            <td className={sts.Cell}>
              {cluster.getIsTlsAllowInsecureConnection()?.getValue() ===
                undefined ? (
                <NoData />
              ) : cluster.getIsTlsAllowInsecureConnection()?.getValue() ===
                true ? (
                "true"
              ) : (
                "false"
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>
              Is Broker Client TLS Enabled with Key Store
            </td>
            <td className={sts.Cell}>
              {cluster.getIsBrokerClientTlsEnabledWithKeyStore()?.getValue() ===
                undefined ? (
                <NoData />
              ) : cluster
                .getIsBrokerClientTlsEnabledWithKeyStore()
                ?.getValue() === true ? (
                "true"
              ) : (
                "false"
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Broker Client TLS Trust Store Type</td>
            <td className={sts.Cell}>
              {cluster.getBrokerClientTlsTrustStoreType()?.getValue() || (
                <NoData />
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Broker Client Trust Certs File Path</td>
            <td className={sts.Cell}>
              {cluster.getBrokerClientTrustCertsFilePath()?.getValue() || (
                <NoData />
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.HighlightedCell}>Listener Name</td>
            <td className={sts.Cell}>
              {cluster.getListenerName()?.getValue() || <NoData />}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

function proxyProtocolPbToString(proxyProtocol: pb.ProxyProtocol) {
  switch (proxyProtocol) {
    case pb.ProxyProtocol.PROXY_PROTOCOL_SNI:
      return "SNI";
    case pb.ProxyProtocol.PROXY_PROTOCOL_UNSPECIFIED:
      return "";
  }
}

const NoData: React.FC = () => {
  return <div className={sts.NoData}>-</div>;
};

export default Cluster;
