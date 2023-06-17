import React, { CSSProperties, ReactNode, useState } from 'react';
import * as GrpcClient from '../GrpcClient/GrpcClient';
import useSWR from 'swr';
import { swrKeys } from '../../../swrKeys';
import { HealthCheckRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

type Status = 'unknown' | 'ok' | 'failed';
type HealthCheckResult = {
  uiServerConnection: Status;
  brokerConnection: Status;
}

export type Value = {
  healthCheckResult: HealthCheckResult;
}

const defaultValue: Value = {
  healthCheckResult: {
    brokerConnection: 'unknown',
    uiServerConnection: 'unknown',
  }
};

const Context = React.createContext<Value>(defaultValue);

type DefaultProviderProps = {
  children: ReactNode,
};

export const DefaultProvider: React.FC<DefaultProviderProps> = (props) => {
  const { brokersServiceClient } = GrpcClient.useContext();
  const [result, setResult] = useState<HealthCheckResult>(defaultValue.healthCheckResult);

  useSWR(
    swrKeys.pulsar.brokers.healthCheck._(),
    async () => {
      const req = new HealthCheckRequest();
      const res = await brokersServiceClient.healthCheck(req, {}).catch(() => { });

      if (res === undefined) {
        setResult({
          brokerConnection: 'unknown',
          uiServerConnection: 'failed',
        });
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        setResult({
          brokerConnection: 'unknown',
          uiServerConnection: 'failed',
        });

        return;
      }


      setResult({
        brokerConnection: res.getIsOk() ? 'ok' : 'failed',
        uiServerConnection: 'ok',
      });
    },
    { refreshInterval: 1000 }
  );

  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32rem',
    padding: '48rem'
  };
  if (result.uiServerConnection === 'failed') {
    return <div style={style}>Your browser &lt;-&gt; UI Server connection check has failed.</div>;
  }

  if (result.brokerConnection === 'failed') {
    return <div style={style}>UI Server &lt;-&gt; Pulsar Broker connection check has failed.</div>;
  }

  return (
    <Context.Provider
      value={{
        ...defaultValue,
        healthCheckResult: result
      }}
    >
      {props.children}
    </Context.Provider>
  )
};

export const useContext = () => React.useContext(Context);
