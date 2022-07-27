import React, { ReactNode, useEffect, useState } from 'react';

import * as _producerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ProducerServiceClientPb';
import * as _consumerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ConsumerServiceClientPb';
import * as _topicServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/TopicServiceClientPb';
import * as _schemaServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/SchemaServiceClientPb';

export type Value = {
  producerServiceClient: _producerServiceClient.ProducerServiceClient,
  consumerServiceClient: _consumerServiceClient.ConsumerServiceClient,
  topicServiceClient: _topicServiceClient.TopicServiceClient,
  schemaServiceClient: _schemaServiceClient.SchemaServiceClient,
}

const defaultValue: Value = {
  producerServiceClient: new _producerServiceClient.ProducerServiceClient(''),
  consumerServiceClient: new _consumerServiceClient.ConsumerServiceClient(''),
  topicServiceClient: new _topicServiceClient.TopicServiceClient(''),
  schemaServiceClient: new _schemaServiceClient.SchemaServiceClient(''),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [producerServiceClient] = useState<_producerServiceClient.ProducerServiceClient>(new _producerServiceClient.ProducerServiceClient('http://localhost:10000'));
  const [consumerServiceClient] = useState<_consumerServiceClient.ConsumerServiceClient>(new _consumerServiceClient.ConsumerServiceClient('http://localhost:10000'));
  const [topicServiceClient] = useState<_topicServiceClient.TopicServiceClient>(new _topicServiceClient.TopicServiceClient('http://localhost:10000'));
  const [schemaServiceClient] = useState<_schemaServiceClient.SchemaServiceClient>(new _schemaServiceClient.SchemaServiceClient('http://localhost:10000'));

  useEffect(() => {
    const enableDevTools = (window as any).__GRPCWEB_DEVTOOLS__ || (() => { });
    enableDevTools([
      consumerServiceClient,
      consumerServiceClient,
      topicServiceClient,
      schemaServiceClient,
    ]);
  }, []);

  return (
    <>
      <Context.Provider
        value={{
          producerServiceClient,
          consumerServiceClient,
          topicServiceClient,
          schemaServiceClient
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
