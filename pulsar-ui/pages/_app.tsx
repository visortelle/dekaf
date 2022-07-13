import type { AppProps } from 'next/app'
import * as AppContext from '../components/app/contexts/AppContext';
import * as AsyncTasks from '../components/app/contexts/AsyncTasks';
import * as Notifications from '../components/app/contexts/Notifications';
import * as PulsarAdminClient from '../components/app/contexts/PulsarAdminClient';
import * as PulsarAdminBatchClient from '../components/app/contexts/PulsarAdminBatchClient/PulsarAdminBatchClient';
import * as PulsarCustomApiClient from '../components/app/contexts/PulsarCustomApiClient/PulsarCustomApiClient';
import * as PulsarGrpcClient from '../components/app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as BrokerConfig from '../components/app/contexts/BrokersConfig';
import * as I18n from '../components/app/contexts/I18n/I18n';
import ReactTooltip from 'react-tooltip';
import 'react-toastify/dist/ReactToastify.css';
import NoSsr from '../components/ui/NoSsr/NoSsr';
import { SWRConfig } from 'swr';
import fetchIntercept from 'fetch-intercept';
import { useEffect } from 'react';
import stringify from 'safe-stable-stringify';

const MyApp = (props: AppProps) => {
  return (
    <AppContext.DefaultProvider>
      <I18n.DefaultProvider>
        <AsyncTasks.DefaultProvider>
          <_MyApp {...props} />
        </AsyncTasks.DefaultProvider>
      </I18n.DefaultProvider>
    </AppContext.DefaultProvider>
  );
}

export const hideShowProgressIndicatorHeader = 'x-hide-show-progress-indicator';

const _MyApp = (props: AppProps) => {
  const { startTask, finishTask } = AsyncTasks.useContext();
  const appContext = AppContext.useContext();

  useEffect(() => {
    // Consider all requests as async tasks to display global progress indicator.
    const unregister = fetchIntercept.register({
      request: function (url, config) {
        if ((config?.headers || {})[hideShowProgressIndicatorHeader] !== undefined) {
          return [url, config]
        }

        startTask(stringify({ url }));

        return [url, config];
      },
      response: function (response) {
        finishTask(stringify(response.request.url));
        return response;
      }
    });

    return () => unregister();
  }, []);

  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        focusThrottleInterval: 120,
        refreshInterval: appContext.performanceOptimizations.pulsarConsumerState === 'active' ? 0 : 15 * 1000
      }}>
      <NoSsr>
        <ReactTooltip html={true} />
        <Notifications.DefaultProvider>
          <PulsarGrpcClient.DefaultProvider>
            <PulsarAdminClient.DefaultProvider>
              <PulsarAdminBatchClient.DefaultProvider>
                <PulsarCustomApiClient.DefaultProvider>
                  <BrokerConfig.DefaultProvider>
                    {typeof window === 'undefined' ? null : <props.Component />}
                  </BrokerConfig.DefaultProvider>
                </PulsarCustomApiClient.DefaultProvider>
              </PulsarAdminBatchClient.DefaultProvider>
            </PulsarAdminClient.DefaultProvider>
          </PulsarGrpcClient.DefaultProvider>
        </Notifications.DefaultProvider>
      </NoSsr >
    </SWRConfig>
  );
}

export default MyApp;
