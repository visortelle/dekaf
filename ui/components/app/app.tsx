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

type AppProps = {
  config: AppContext.Config;
};

const App: React.FC<AppProps> = (props) => {
  return (
    <AppContext.DefaultProvider config={props.config}>
      <I18n.DefaultProvider>
        <AsyncTasks.DefaultProvider>
          <_App {...props} />
        </AsyncTasks.DefaultProvider>
      </I18n.DefaultProvider>
    </AppContext.DefaultProvider>
  );
}

export const hideShowProgressIndicatorHeader = 'x-hide-show-progress-indicator';

const _App: React.FC<AppProps> = (props) => {
  useInterval(() => ReactTooltip.rebuild(), 2000); // Fix react-tooltip doesn't hide.

  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        focusThrottleInterval: 120,
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnMount: true,
      }}>

      <PulsarGrpcClient.DefaultProvider grpcWebUrl={`${props.config.publicUrl.replace(/\/$/, '')}/api`}>
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
            <BrokerConfig.DefaultProvider>
              <Router />
            </BrokerConfig.DefaultProvider>
          </Modals.DefaultProvider>
        </Notifications.DefaultProvider>
      </PulsarGrpcClient.DefaultProvider>
    </SWRConfig >
  );
}

export default App;
