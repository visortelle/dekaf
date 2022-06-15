import type { AppProps } from 'next/app'
import * as AsyncTasks from '../components/contexts/AsyncTasks';
import * as Notifications from '../components/contexts/Notifications';
import * as PulsarAdminClient from '../components/contexts/PulsarAdminClient';
import * as BrokerConfig from '../components/contexts/BrokerConfig';
import 'react-toastify/dist/ReactToastify.css';
import NoSsr from '../components/NoSsr/NoSsr';
import { SWRConfig } from 'swr';

const MyApp = (props: AppProps) => {
  return (
    <NoSsr>
      <SWRConfig value={{ shouldRetryOnError: false, focusThrottleInterval: 120 }}>
        <AsyncTasks.DefaultProvider>
          <Notifications.DefaultProvider>
            <PulsarAdminClient.DefaultProvider>
              <BrokerConfig.DefaultProvider>
                {typeof window === 'undefined' ? null : <props.Component />}
              </BrokerConfig.DefaultProvider>
            </PulsarAdminClient.DefaultProvider>
          </Notifications.DefaultProvider>
        </AsyncTasks.DefaultProvider>
      </SWRConfig>
    </NoSsr>
  );
}

export default MyApp;
