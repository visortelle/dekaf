import React, { CSSProperties, ReactNode, useEffect, useState } from 'react';
import * as GrpcClient from '../GrpcClient/GrpcClient';
import useSWR from 'swr';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

type Status = 'unknown' | 'ok' | 'failed';
type HealthCheckResult = {
  uiServerConnection: Status;
  brokerConnection: Status;
}

export type Value = {
  healthCheckResult: HealthCheckResult;
  brokerVersion: string | undefined;
}

const defaultValue: Value = {
  healthCheckResult: {
    brokerConnection: 'unknown',
    uiServerConnection: 'unknown',
  },
  brokerVersion: undefined
};

const Context = React.createContext<Value>(defaultValue);

type DefaultProviderProps = {
  children: ReactNode,
};

export const DefaultProvider: React.FC<DefaultProviderProps> = (props) => {
  const { brokersServiceClient } = GrpcClient.useContext();
  const [result, setResult] = useState<HealthCheckResult>(defaultValue.healthCheckResult);
  const [brokerVersion, setBrokerVersion] = useState<Value['brokerVersion']>();

  useSWR(
    swrKeys.pulsar.brokers.healthCheck._(),
    async () => {
      const req = new pb.HealthCheckRequest();
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
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    const getBrokerVersion = async () => {
      const req = new pb.GetVersionRequest();

      const res = await brokersServiceClient.getVersion(req, {}).catch(() => {});
      if (res === undefined || res.getStatus()?.getCode() !== Code.OK) {
        setBrokerVersion(undefined);
        return;
      }

      const brokerVersion = res.getVersion();
      setBrokerVersion(brokerVersion);
    }

    getBrokerVersion();
  }, []);

  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32rem',
    padding: '48rem'
  };
  // if (result.uiServerConnection === 'failed') {
  //   return <div style={style}>Your browser ↔ Dekaf connection check has failed.</div>;
  // }

  // if (result.brokerConnection === 'failed') {
  //   return <div style={style}>Dekaf ↔ Pulsar Broker connection check has failed.</div>;
  // }

  return (
    <Context.Provider
      value={{
        ...defaultValue,
        healthCheckResult: result,
        brokerVersion
      }}
    >
      {props.children}
    </Context.Provider>
  )
};

export const useContext = () => React.useContext(Context);
