import type { AppProps } from 'next/app'
import * as AsyncTasks from '../components/app/contexts/AsyncTasks';
import * as Notifications from '../components/app/contexts/Notifications';
import * as PulsarAdminClient from '../components/app/contexts/PulsarAdminClient';
import * as PulsarAdminBatchClient from '../components/app/contexts/PulsarAdminBatchClient/PulsarAdminBatchClient';
import * as BrokerConfig from '../components/app/contexts/BrokersConfig';
import 'react-toastify/dist/ReactToastify.css';
import NoSsr from '../components/ui/NoSsr/NoSsr';
import { SWRConfig } from 'swr';

const MyApp = (props: AppProps) => {
  return (
    <AsyncTasks.DefaultProvider>
      <_MyApp {...props} />
    </AsyncTasks.DefaultProvider>
  );
}

const _MyApp = (props: AppProps) => {
  return (
    <SWRConfig value={{ shouldRetryOnError: false, focusThrottleInterval: 120 }}>
      <NoSsr>
        <Notifications.DefaultProvider>
          <PulsarAdminClient.DefaultProvider>
          <PulsarAdminBatchClient.DefaultProvider>
            <BrokerConfig.DefaultProvider>
              {typeof window === 'undefined' ? null : <props.Component />}
            </BrokerConfig.DefaultProvider>
            </PulsarAdminBatchClient.DefaultProvider>
          </PulsarAdminClient.DefaultProvider>
        </Notifications.DefaultProvider>
      </NoSsr >
    </SWRConfig>
  );
}

export default MyApp;
