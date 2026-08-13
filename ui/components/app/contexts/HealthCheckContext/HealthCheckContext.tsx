import React, { ReactNode, useEffect, useState } from 'react';
import * as GrpcClient from '../GrpcClient/GrpcClient';
import useSWR from 'swr';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/brokers/v1/brokers_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { createPortal } from 'react-dom';
import HealthCheck from '../../../InstancePage/Overview/HealthCheck/HealthCheck';
import { ModalElement } from '../Modals/Modals';

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
  const [isDismissed, setIsDismissed] = useState(false);
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

  const isConnectionFailed = result.uiServerConnection === 'failed' || result.brokerConnection === 'failed';

  // Re-arm the overlay once the connection is restored, so that a new outage is
  // reported again even if the user dismissed the previous one.
  useEffect(() => {
    if (!isConnectionFailed) {
      setIsDismissed(false);
    }
  }, [isConnectionFailed]);

  const isShowOverlay = isConnectionFailed && !isDismissed;
  const overlay = isShowOverlay ? createPortal(
    <ModalElement
      entry={{
        id: 'health-check',
        testId: 'health-overlay',
        title: 'There are connectivity issues',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem' }}>
            <ul>
              <li>
                If your Pulsar cluster requires authentication, close this dialog and set your
                credentials using the 🔑 button in the navigation sidebar on the left.
              </li>
              <li>
                If the problem persists, contact your administrator.
              </li>
              <li>
                <a target="_blank" href='https://github.com/visortelle/dekaf/issues'>🛟 Get community support</a> if you are an administrator and not sure how to fix the problem.
              </li>
            </ul>
            <HealthCheck />
            <div><strong>Last checked at:</strong> {new Date(lastChecked.current).toLocaleTimeString()}</div>
          </div>
        )
      }}
      isVisible
      onClose={() => setIsDismissed(true)}
    />,
    document.body
  ) : null;

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
