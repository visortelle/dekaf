import React, {useEffect} from "react";
import s from "./Cluster.module.css";
import * as Notifications from "../../../../app/contexts/Notifications";
import * as GrpcClient from "../../../../app/contexts/GrpcClient/GrpcClient";
import * as pb from "../../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import {Code} from "../../../../../grpc-web/google/rpc/code_pb";
import {swrKeys} from "../../../../swrKeys";
import useSWR from "swr";
import {help} from "./help"
import NoData from "../../../../ui/NoData/NoData";
import ClusterTable from "../../../../ui/ClusterTable/ClusterTable";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize/index";
import { defaultSchema } from "rehype-sanitize";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as AppContext from "../../../../app/contexts/AppContext";
import {GetInstanceMarkdownRequest} from "../../../../../grpc-web/tools/teal/pulsar/ui/markdown/v1/markdown_pb";

export type ClusterProps = {
  cluster: string;
};

export type ColumnKey =
  'clusterName' |
  'serviceUrl' |
  'serviceUrlTsl' |
  'brokerServiceUrl' |
  'brokerServiceUrlTsl' |
  'proxyServiceUrl' |
  'proxyProtocol' |
  'peerClusterNames' |
  'authenticationPlugin' |
  'authenticationParameters' |
  'isBrokerClientTlsEnabled' |
  'isTlsAllowInsecureConnection' |
  'isBrokerClientTlsEnabledWithKeyStore' |
  'brokerClientTlsTrustStoreType' |
  'brokerClientTrustCertsFilePath' |
  'listenerName'


const Cluster: React.FC<ClusterProps> = (props) => {
  const { config } = AppContext.useContext();
  const {notifyError} = Notifications.useContext();
  const {clustersServiceClient} = GrpcClient.useContext();
  const {markdownServiceClient} = GrpcClient.useContext();
  const [markdownData, setMarkdownData] = React.useState<string>('');

  const schema = {
    ...defaultSchema,
    tagNames: [...defaultSchema.tagNames!, 'iframe'],
    attributes: {
      ...defaultSchema.attributes,
      iframe: ['src', 'width', 'height', 'frameborder']
    }
  }

  useEffect(() => {
    const fetchMarkdownData = async () => {
      const req = new GetInstanceMarkdownRequest();
      req.setInstanceUrl(config.pulsarInstance.webServiceUrl);
      req.setClusterName(props.cluster);

      const res = await markdownServiceClient.getInstanceMarkdown(req, null)
        .catch(err => notifyError(`Unable to get cluster markdown. ${err.getMessage()}`));

      if (res === undefined) {
        return "";
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get cluster markdown. ${res.getStatus()?.getMessage()}`);
        return "";
      }

      return res.getMarkdown();
    };

    fetchMarkdownData().then(markdown => {
      console.log(markdown.toString());
      setMarkdownData(markdown.toString());
    });
  }, []);

  const {data: cluster, error: clusterError} = useSWR(
    swrKeys.pulsar.clusters.cluster._({cluster: props.cluster}),
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

      <ClusterTable
        help={help}
        clusterRows={{
          clusterName: {
            data: props.cluster,
            label: 'Cluster Name',
          },
          serviceUrl: {
            data: cluster.getServiceUrl()?.getValue() || <NoData/>,
            label: 'Service URL',
          },
          serviceUrlTsl: {
            data: cluster.getServiceUrlTls()?.getValue() || <NoData/>,
            label: 'Service URL TLS'
          },
          brokerServiceUrl: {
            data: cluster.getBrokerServiceUrl()?.getValue() || <NoData/>,
            label: 'Broker Service URL'
          },
          brokerServiceUrlTsl: {
            data: cluster.getBrokerServiceUrlTls()?.getValue() || <NoData/>,
            label: 'Broker Service URL TLS'
          },
          proxyServiceUrl: {
            data: cluster.getProxyServiceUrl()?.getValue() || <NoData/>,
            label: 'Proxy Service URL'
          },
          proxyProtocol: {
            data: proxyProtocolPbToString(cluster.getProxyProtocol()) || <NoData/>,
            label: 'Proxy Protocol'
          },
          peerClusterNames: {
            data: cluster.getPeerClusterNamesList().length === 0 ? (
              <NoData/>
            ) : (
              cluster
                .getPeerClusterNamesList()
                .map((peerClusterName) => <code>{peerClusterName}</code>)
            ),
            label: 'Peer Cluster Names'
          },
          authenticationPlugin: {
            data: cluster.getAuthenticationPlugin()?.getValue() || <NoData/>,
            label: 'Authentication Plugin'
          },
          authenticationParameters: {
            data: cluster.getAuthenticationParameters()?.getValue() || <NoData/>,
            label: 'Authentication Parameters'
          },
          isBrokerClientTlsEnabled: {
            data: cluster.getIsBrokerClientTlsEnabled()?.getValue() === undefined ? (
              <NoData/>
            ) : cluster.getIsBrokerClientTlsEnabled()?.getValue() === true ? (
              "true"
            ) : (
              "false"
            ),
            label: "Is Broker Client TLS Enabled"
          },
          isTlsAllowInsecureConnection: {
            data: cluster.getIsTlsAllowInsecureConnection()?.getValue() === undefined ? (
              <NoData/>
            ) : cluster.getIsTlsAllowInsecureConnection()?.getValue() ===
            true ? (
              "true"
            ) : (
              "false"
            ),
            label: 'Is TLS Allow Insecure Connection'
          },
          isBrokerClientTlsEnabledWithKeyStore: {
            data: cluster.getIsBrokerClientTlsEnabledWithKeyStore()?.getValue() === undefined ? (
              <NoData/>
            ) : cluster
              .getIsBrokerClientTlsEnabledWithKeyStore()
              ?.getValue() === true ? (
              "true"
            ) : (
              "false"
            ),
            label: 'Is Broker Client TLS Enabled with Key Store'
          },
          brokerClientTlsTrustStoreType: {
            data: cluster.getBrokerClientTlsTrustStoreType()?.getValue() || (
              <NoData/>
            ),
            label: 'Broker Client TLS Trust Store Type'
          },
          brokerClientTrustCertsFilePath: {
            data: cluster.getBrokerClientTrustCertsFilePath()?.getValue() || (
              <NoData/>
            ),
            label: 'Broker Client Trust Certs File Path'
          },
          listenerName: {
            data: cluster.getListenerName()?.getValue() || <NoData/>,
            label: 'Listener Name'
          }
        }}
      />

      <div className={s.Markdown}>
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
          remarkPlugins={[remarkGfm]}
          children={markdownData}
        />
      </div>
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

export default Cluster;
