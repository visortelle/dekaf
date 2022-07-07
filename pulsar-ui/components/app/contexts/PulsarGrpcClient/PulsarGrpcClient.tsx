import React, { ReactNode, useState } from 'react';
import * as _topicServiceClient from '../../../../grpc-web/api/v1/TopicServiceClientPb';

export type Value = {
  topicServiceClient: _topicServiceClient.TopicServiceClient,
}

const defaultValue: Value = {
  topicServiceClient: new _topicServiceClient.TopicServiceClient(''),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [topicServiceClient, _] = useState<_topicServiceClient.TopicServiceClient>(new _topicServiceClient.TopicServiceClient('http://localhost:10000'));

  return (
    <>
      <Context.Provider
        value={{
          topicServiceClient,
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
