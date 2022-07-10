import React, { ReactNode, useEffect, useState } from 'react';
import * as _consumerServiceClient from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/ConsumerServiceClientPb';

export type Value = {
  consumerServiceClient: _consumerServiceClient.ConsumerServiceClient,
}

const defaultValue: Value = {
  consumerServiceClient: new _consumerServiceClient.ConsumerServiceClient(''),
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const [consumerServiceClient, _] = useState<_consumerServiceClient.ConsumerServiceClient>(new _consumerServiceClient.ConsumerServiceClient('http://localhost:10000'));

  // useEffect(() => {
  //   if (!window) {
  //     return;
  //   }

  //   // Use https://github.com/SafetyCulture/grpc-web-devtools
  //   const enableDevTools = (window as any).__GRPCWEB_DEVTOOLS__ || (() => { });
  //   enableDevTools([consumerServiceClient]);
  // }, [consumerServiceClient]);

  return (
    <>
      <Context.Provider
        value={{
          consumerServiceClient: consumerServiceClient,
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
