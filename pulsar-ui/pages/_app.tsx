import type { AppProps } from 'next/app'
import * as AsyncTasks from '../components/contexts/AsyncTasks';
import * as Notifications from '../components/contexts/Notifications';
import * as PulsarAdminClient from '../components/contexts/PulsarAdminClient';
import 'react-toastify/dist/ReactToastify.css';
import NoSsr from '../components/NoSsr/NoSsr';

const MyApp = (props: AppProps) => {
  return (
    <NoSsr>
      <AsyncTasks.DefaultProvider>
        <Notifications.DefaultProvider>
          <PulsarAdminClient.DefaultProvider>
            {typeof window === 'undefined' ? null : <props.Component />}
          </PulsarAdminClient.DefaultProvider>
        </Notifications.DefaultProvider>
      </AsyncTasks.DefaultProvider>
    </NoSsr>
  );
}

export default MyApp;
