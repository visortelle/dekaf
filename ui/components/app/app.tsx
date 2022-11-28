import * as AppContext from './contexts/AppContext';
import * as AsyncTasks from './contexts/AsyncTasks';
import * as Notifications from './contexts/Notifications';
import * as PulsarGrpcClient from './contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Modals from './contexts/Modals/Modals';
import * as BrokerConfig from './contexts/BrokersConfig';
import * as I18n from './contexts/I18n/I18n';
import ReactTooltip from 'react-tooltip';
import 'react-toastify/dist/ReactToastify.css';
import { SWRConfig } from 'swr';
import useInterval from './hooks/use-interval';
import Router from './Router/Router'
import './globals.css';

const MyApp = () => {
  return (
    <AppContext.DefaultProvider>
      <I18n.DefaultProvider>
        <AsyncTasks.DefaultProvider>
          <_MyApp />
        </AsyncTasks.DefaultProvider>
      </I18n.DefaultProvider>
    </AppContext.DefaultProvider>
  );
}

export const hideShowProgressIndicatorHeader = 'x-hide-show-progress-indicator';

const _MyApp = () => {
  useInterval(() => ReactTooltip.rebuild(), 2000); // Fix react-tooltip doesn't hide.

  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        focusThrottleInterval: 120,
        // refreshInterval: appContext.performanceOptimizations.pulsarConsumerState === 'active' ? 0 : 15_000, // XXX - check on schema editor tab (or any other) before uncomment. It shouldn't reset react component state.
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnMount: true,
      }}>
      <ReactTooltip
        html={true}
        event="click"
        arrowColor='#fff'
        backgroundColor='#fff'
        textColor='var(--text-color)'
        border={true}
        borderColor="#ddd"
      />

      <Notifications.DefaultProvider>
        <Modals.DefaultProvider>
          <PulsarGrpcClient.DefaultProvider>
            <BrokerConfig.DefaultProvider>
              <Router />
            </BrokerConfig.DefaultProvider>
          </PulsarGrpcClient.DefaultProvider>
        </Modals.DefaultProvider>
      </Notifications.DefaultProvider>
    </SWRConfig>
  );
}

export default MyApp;
