import * as AppContext from "./contexts/AppContext";
import * as AsyncTasks from "./contexts/AsyncTasks";
import * as Notifications from "./contexts/Notifications";
import * as GrpcClient from "./contexts/GrpcClient/GrpcClient";
import * as BrokerConfig from "./contexts/BrokersConfig";
import * as I18n from "./contexts/I18n/I18n";
import "react-toastify/dist/ReactToastify.css";
import { SWRConfig } from "swr";
import Router from "./Router/Router";
import Tooltip from "../ui/Tooltip/Tooltip";
import { HelmetProvider } from "react-helmet-async";
import InstanceColor from "./instance-color/InstanceColor";
import * as HealthCheckContext from './contexts/HealthCheckContext/HealthCheckContext';
import React from "react";
import './detect-platform';

type AppProps = {
  config: AppContext.Config;
};

const App: React.FC<AppProps> = (props) => {
  return (
    <>
      <AppContext.DefaultProvider config={props.config}>
        <I18n.DefaultProvider>
          <AsyncTasks.DefaultProvider>
            <_App {...props} />
          </AsyncTasks.DefaultProvider>
        </I18n.DefaultProvider>
      </AppContext.DefaultProvider>
      <Tooltip />
    </>
  );
};

export const hideShowProgressIndicatorHeader = "x-hide-show-progress-indicator";

const _App: React.FC<AppProps> = (props) => {
  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        focusThrottleInterval: 120,
        refreshInterval: 0, // Don't change it without re-checking the whole app functionality.
        revalidateOnFocus: false,
        revalidateOnMount: true,
        revalidateIfStale: true,
      }}
    >
      <GrpcClient.DefaultProvider grpcWebUrl={`${props.config.publicBaseUrl.replace(/\/$/, "")}/api`}>
        <HealthCheckContext.DefaultProvider>
          <Notifications.DefaultProvider>
            <BrokerConfig.DefaultProvider>
              <HelmetProvider>
                <Router basename={new URL(props.config.publicBaseUrl).pathname} />
              </HelmetProvider>
            </BrokerConfig.DefaultProvider>
          </Notifications.DefaultProvider>
        </HealthCheckContext.DefaultProvider>
      </GrpcClient.DefaultProvider>
      <InstanceColor color={props.config.pulsarColor} />
    </SWRConfig>
  );
};

export default App;
