import React, { ReactNode, useState } from 'react';
import * as _consumerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ConsumerServiceClientPb';
import * as _topicServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/TopicServiceClientPb';

export type Value = {
  consumerServiceClient: _consumerServiceClient.ConsumerServiceClient,
  topicServiceClient: _topicServiceClient.TopicServiceClient,
}

const defaultValue: Value = {
  consumerServiceClient: new _consumerServiceClient.ConsumerServiceClient(''),
  topicServiceClient: new _topicServiceClient.TopicServiceClient(''),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [consumerServiceClient] = useState<_consumerServiceClient.ConsumerServiceClient>(new _consumerServiceClient.ConsumerServiceClient('http://localhost:10000'));
  const [topicServiceClient] = useState<_topicServiceClient.TopicServiceClient>(new _topicServiceClient.TopicServiceClient('http://localhost:10000'));

  return (
    <>
      <Context.Provider
        value={{
          consumerServiceClient,
          topicServiceClient
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
