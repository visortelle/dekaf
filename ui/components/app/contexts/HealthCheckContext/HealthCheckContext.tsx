import React, { CSSProperties, ReactNode, useEffect, useState } from 'react';
import * as GrpcClient from '../GrpcClient/GrpcClient';
import useSWR from 'swr';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { createPortal } from 'react-dom';
import HealthCheck from '../../../InstancePage/Overview/HealthCheck/HealthCheck';
import { last } from 'lodash';
import { H3 } from '../../../ui/H/H';

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
  const lastChecked = React.useRef<number>(0);

  useSWR(
    swrKeys.pulsar.brokers.healthCheck._(),
    async () => {
      lastChecked.current = Date.now();

      const req = new pb.HealthCheckRequest();
      const res = await brokersServiceClient.healthCheck(req, {}).catch(() => { });

      if (res === undefined) {
        setResult({
          brokerConnection: 'unknown',
          uiServerConnection: 'failed',
        });
        return;
      }

      const isBrokerConnectionOk = res.getIsOk();
      const isReloadPage = (result.brokerConnection === 'failed' || result.uiServerConnection === 'failed') && isBrokerConnectionOk;
      if (isReloadPage) {
        window.location.reload();
      }

      setResult({
        brokerConnection: isBrokerConnectionOk ? 'ok' : 'failed',
        uiServerConnection: 'ok',
      });
    },
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    const getBrokerVersion = async () => {
      const req = new pb.GetVersionRequest();

      const res = await brokersServiceClient.getVersion(req, {}).catch(() => { });
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
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48rem',
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    position: 'fixed',
    top: 0,
    left: 0
  };

  const isShowOverlay = result.uiServerConnection === 'failed' || result.brokerConnection === 'failed';
  const overlay = isShowOverlay ? createPortal(
    <div style={style}>
      <div style={{ background: '#fff', borderRadius: '12rem', padding: '24rem 48rem', display: 'flex', flexDirection: 'column', gap: '12rem' }}>
        <div>
          <H3>
            There are connectivity issues
          </H3>

          <ul>
            <li>
              If the problem persists, contact your administrator.
            </li>
            <li>
              <a target="_blank" href='https://dekaf.io/support'>🛟 Get Dekaf support</a> if you are an administrator and not sure how to fix the problem.
            </li>
          </ul>
        </div>
        <HealthCheck />
        <div><strong>Last checked at:</strong> {new Date(lastChecked.current).toLocaleTimeString()}</div>
      </div>
    </div>,
    document.body
  ) : null;

  console.log('overlay', isShowOverlay);

  return (
    <Context.Provider
      value={{
        ...defaultValue,
        healthCheckResult: result,
        brokerVersion
      }}
    >
      {overlay}
      {props.children}
    </Context.Provider>
  )
};

export const useContext = () => React.useContext(Context);
