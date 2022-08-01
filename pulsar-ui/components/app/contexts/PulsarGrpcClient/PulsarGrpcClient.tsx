import React, { ReactNode, useEffect, useRef, useState } from 'react';

import * as _producerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ProducerServiceClientPb';
import * as _consumerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ConsumerServiceClientPb';
import * as _topicServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/TopicServiceClientPb';
import * as _schemaServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/SchemaServiceClientPb';
import * as _namespaceServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/NamespaceServiceClientPb';

export type Value = {
  producerServiceClient: _producerServiceClient.ProducerServiceClient,
  consumerServiceClient: _consumerServiceClient.ConsumerServiceClient,
  topicServiceClient: _topicServiceClient.TopicServiceClient,
  schemaServiceClient: _schemaServiceClient.SchemaServiceClient,
  namespaceServiceClient: _namespaceServiceClient.NamespaceServiceClient,
}

const defaultValue: Value = {
  producerServiceClient: new _producerServiceClient.ProducerServiceClient(''),
  consumerServiceClient: new _consumerServiceClient.ConsumerServiceClient(''),
  topicServiceClient: new _topicServiceClient.TopicServiceClient(''),
  schemaServiceClient: new _schemaServiceClient.SchemaServiceClient(''),
  namespaceServiceClient: new _namespaceServiceClient.NamespaceServiceClient(''),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [producerServiceClient] = useState(new _producerServiceClient.ProducerServiceClient('http://localhost:10000'));
  const [consumerServiceClient] = useState(new _consumerServiceClient.ConsumerServiceClient('http://localhost:10000'));
  const [topicServiceClient] = useState(new _topicServiceClient.TopicServiceClient('http://localhost:10000'));
  const [schemaServiceClient] = useState(new _schemaServiceClient.SchemaServiceClient('http://localhost:10000'));
  const [namespaceServiceClient] = useState(new _namespaceServiceClient.NamespaceServiceClient('http://localhost:10000'));

  // GRPCWEB_DEVTOOLS extension is sometimes useful, but it has a lot of bugs it breaks the app.
  // const isDevToolsInitiates = useRef<boolean>(false);
  // if (!isDevToolsInitiates.current) {
  //   const enableDevTools = (window as any).__GRPCWEB_DEVTOOLS__ || (() => { });
  //   enableDevTools([
  //     consumerServiceClient,
  //     consumerServiceClient,
  //     topicServiceClient,
  //     schemaServiceClient,
  //     namespaceServiceClient,
  //   ]);
  //   isDevToolsInitiates.current = true;
  // }

  return (
    <>
      <Context.Provider
        value={{
          producerServiceClient,
          consumerServiceClient,
          topicServiceClient,
          schemaServiceClient,
          namespaceServiceClient
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
