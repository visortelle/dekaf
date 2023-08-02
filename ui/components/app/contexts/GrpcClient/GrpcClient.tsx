import React, { ReactNode, useState } from 'react';

import * as _pulsarAuthServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/Pulsar_authServiceClientPb';
import * as _producerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ProducerServiceClientPb';
import * as _consumerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ConsumerServiceClientPb';
import * as _topicServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/TopicServiceClientPb';
import * as _schemaServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/SchemaServiceClientPb';
import * as _namespaceServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/NamespaceServiceClientPb';
import * as _tenantServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/TenantServiceClientPb';
import * as _clustersServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/ClustersServiceClientPb';
import * as _metricsServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/metrics/v1/MetricsServiceClientPb';
import * as _brokersServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/BrokersServiceClientPb';
import * as _brokerstatsServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/brokerstats/v1/BrokerstatsServiceClientPb';
import * as _topicpoliciesServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/TopicpoliciesServiceClientPb';
import * as _markdownServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/markdown/v1/MarkdownServiceClientPb';

export type Value = {
  pulsarAuthServiceClient: _pulsarAuthServiceClient.PulsarAuthServiceClient,
  producerServiceClient: _producerServiceClient.ProducerServiceClient,
  consumerServiceClient: _consumerServiceClient.ConsumerServiceClient,
  topicServiceClient: _topicServiceClient.TopicServiceClient,
  topicPoliciesServiceClient: _topicpoliciesServiceClient.TopicpoliciesServiceClient,
  schemaServiceClient: _schemaServiceClient.SchemaServiceClient,
  namespaceServiceClient: _namespaceServiceClient.NamespaceServiceClient,
  tenantServiceClient: _tenantServiceClient.TenantServiceClient,
  clustersServiceClient: _clustersServiceClient.ClustersServiceClient,
  metricsServiceClient: _metricsServiceClient.MetricsServiceClient,
  brokersServiceClient: _brokersServiceClient.BrokersServiceClient,
  brokerstatsServiceClient: _brokerstatsServiceClient.BrokerStatsServiceClient,
  markdownServiceClient: _markdownServiceClient.MarkdownServiceClient,
}

const defaultValue: Value = {
  pulsarAuthServiceClient: new _pulsarAuthServiceClient.PulsarAuthServiceClient(''),
  producerServiceClient: new _producerServiceClient.ProducerServiceClient(''),
  consumerServiceClient: new _consumerServiceClient.ConsumerServiceClient(''),
  topicServiceClient: new _topicServiceClient.TopicServiceClient(''),
  topicPoliciesServiceClient: new _topicpoliciesServiceClient.TopicpoliciesServiceClient(''),
  schemaServiceClient: new _schemaServiceClient.SchemaServiceClient(''),
  namespaceServiceClient: new _namespaceServiceClient.NamespaceServiceClient(''),
  tenantServiceClient: new _tenantServiceClient.TenantServiceClient(''),
  clustersServiceClient: new _clustersServiceClient.ClustersServiceClient(''),
  metricsServiceClient: new _metricsServiceClient.MetricsServiceClient(''),
  brokersServiceClient: new _brokersServiceClient.BrokersServiceClient(''),
  brokerstatsServiceClient: new _brokerstatsServiceClient.BrokerStatsServiceClient(''),
  markdownServiceClient: new _markdownServiceClient.MarkdownServiceClient(''),
};

const Context = React.createContext<Value>(defaultValue);

type DefaultProviderProps = {
  children: ReactNode,
  grpcWebUrl: string
};
export const DefaultProvider: React.FC<DefaultProviderProps> = (props) => {
  const [pulsarAuthServiceClient] = useState(new _pulsarAuthServiceClient.PulsarAuthServiceClient(props.grpcWebUrl));
  const [producerServiceClient] = useState(new _producerServiceClient.ProducerServiceClient(props.grpcWebUrl));
  const [consumerServiceClient] = useState(new _consumerServiceClient.ConsumerServiceClient(props.grpcWebUrl));
  const [topicServiceClient] = useState(new _topicServiceClient.TopicServiceClient(props.grpcWebUrl));
  const [topicpoliciesServiceClient] = useState(new _topicpoliciesServiceClient.TopicpoliciesServiceClient(props.grpcWebUrl));
  const [schemaServiceClient] = useState(new _schemaServiceClient.SchemaServiceClient(props.grpcWebUrl));
  const [namespaceServiceClient] = useState(new _namespaceServiceClient.NamespaceServiceClient(props.grpcWebUrl));
  const [tenantServiceClient] = useState(new _tenantServiceClient.TenantServiceClient(props.grpcWebUrl));
  const [clustersServiceClient] = useState(new _clustersServiceClient.ClustersServiceClient(props.grpcWebUrl));
  const [metricsServiceClient] = useState(new _metricsServiceClient.MetricsServiceClient(props.grpcWebUrl));
  const [brokersServiceClient] = useState(new _brokersServiceClient.BrokersServiceClient(props.grpcWebUrl));
  const [brokerstatsServiceClient] = useState(new _brokerstatsServiceClient.BrokerStatsServiceClient(props.grpcWebUrl));
  const [markdownServiceClient] = useState(new _markdownServiceClient.MarkdownServiceClient(props.grpcWebUrl));

  return (
    <>
      <Context.Provider
        value={{
          pulsarAuthServiceClient,
          producerServiceClient,
          consumerServiceClient,
          topicServiceClient,
          topicPoliciesServiceClient: topicpoliciesServiceClient,
          schemaServiceClient,
          namespaceServiceClient,
          tenantServiceClient,
          clustersServiceClient,
          metricsServiceClient,
          brokersServiceClient,
          brokerstatsServiceClient,
          markdownServiceClient,
        }}
      >
        {props.children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
