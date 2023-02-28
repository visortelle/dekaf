import React from "react";
import s from "./Cluster.module.css";
import sts from "../../../ui/SimpleTable/SimpleTable.module.css";
import * as Notifications from "../../../app/contexts/Notifications";
import * as PulsarGrpcClient from "../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import { swrKeys } from "../../../swrKeys";
import useSWR from "swr";

export type ClusterProps = {
  cluster: string;
};

const Cluster: React.FC<ClusterProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { clustersServiceClient } = PulsarGrpcClient.useContext();

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
      <strong>Cluster:</strong> {props.cluster}
      <table className={sts.Table}>
        <tbody>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Service URL</td>
            <td className={sts.Cell}>
              {cluster.getServiceUrl()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Service URL TLS</td>
            <td className={sts.Cell}>
              {cluster.getServiceUrlTls()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Broker service URL</td>
            <td className={sts.Cell}>
              {cluster.getBrokerServiceUrl()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Broker service URL TLS</td>
            <td className={sts.Cell}>
              {cluster.getBrokerServiceUrlTls()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Proxy service URL</td>
            <td className={sts.Cell}>
              {cluster.getProxyServiceUrl()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Proxy protocol</td>
            <td className={sts.Cell}>
              {proxyProtocolPbToString(cluster.getProxyProtocol()) || (
                <NoData />
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Peer cluster names</td>
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
            <td className={sts.Cell}>Authentication plugin</td>
            <td className={sts.Cell}>
              {cluster.getAuthenticationPlugin()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Authentication parameters</td>
            <td className={sts.Cell}>
              {cluster.getAuthenticationParameters()?.getValue() || <NoData />}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Is broker client TLS enabled</td>
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
            <td className={sts.Cell}>Is TLS allow insecure connection</td>
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
            <td className={sts.Cell}>
              Is broker client TLS enabled with key store
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
            <td className={sts.Cell}>Broker client TLS trust store type</td>
            <td className={sts.Cell}>
              {cluster.getBrokerClientTlsTrustStoreType()?.getValue() || (
                <NoData />
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Broker client trust certs file path</td>
            <td className={sts.Cell}>
              {cluster.getBrokerClientTrustCertsFilePath()?.getValue() || (
                <NoData />
              )}
            </td>
          </tr>
          <tr className={sts.Row}>
            <td className={sts.Cell}>Listener name</td>
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
