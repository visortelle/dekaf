import * as AppContext from './contexts/AppContext';
import * as AsyncTasks from './contexts/AsyncTasks';
import * as Notifications from './contexts/Notifications';
import * as PulsarGrpcClient from './contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Modals from './contexts/Modals/Modals';
import * as BrokerConfig from './contexts/BrokersConfig';
import * as I18n from './contexts/I18n/I18n';
import 'react-toastify/dist/ReactToastify.css';
import { SWRConfig } from 'swr';
import Router from './Router/Router'
import { TooltipProvider } from 'react-tooltip';
import Tooltip from '../ui/Tooltip/Tooltip';

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
        <Notifications.DefaultProvider>
          <Modals.DefaultProvider>
            <BrokerConfig.DefaultProvider>
              <TooltipProvider>
                <Router />
                <Tooltip />
              </TooltipProvider>
            </BrokerConfig.DefaultProvider>
          </Modals.DefaultProvider>
        </Notifications.DefaultProvider>
      </PulsarGrpcClient.DefaultProvider>
    </SWRConfig >
  );
}

export default App;
