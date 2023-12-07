import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import '../../assets/globals.css';
import '../../assets/fonts.css';
import { ApiEvent } from '../main/api/service';
import * as I18n from './app/I18n/I18n';
import * as Notifications from './app/Notifications/Notifications';
import * as Modals from './app/Modals/Modals';
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from 'react';
import { LocalPulsarInstance } from '../main/api/local-pulsar-instances/types';
import PulsarStandaloneConfigInput from './LocalPulsarInstanceEditor/PulsarStandaloneConfigInput/PulsarStandaloneConfigInput';
import PulsarDistributionPickerButton from './LocalPulsarInstanceEditor/PulsarDistributionPickerButton/PulsarDistributionPickerButton';
import SmallButton from './ui/SmallButton/SmallButton';
import CreateLocalPulsarInstanceButton from './CreateLocalPulsarInstanceButton/CreateLocalPulsarInstanceButton';
import Tooltip from './ui/Tooltip/Tooltip';
import { apiChannel } from '../main/channels';
import ConnectionsList from './ConnectionsList/ConnectionsList';
import CreateRemotePulsarConnectionButton from './CreateRemotePulsarConnectionButton/CreateRemotePulsarConnectionButton';

// Debug
if (process.env.NODE_ENV === "development") {
  window.electron.ipcRenderer.on(apiChannel, (arg) => {
    console.debug('Received API event:', arg);
  });
}

function InitialAppScreen() {
  const { notifyError } = Notifications.useContext();

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ErrorHappened") {
        notifyError(arg.message);
      }
    });
  }, []);

  return (
    <I18n.DefaultProvider>
      <Notifications.DefaultProvider>
        <Modals.DefaultProvider>
          <div>
            <Tooltip />

            <CreateLocalPulsarInstanceButton />
            <CreateRemotePulsarConnectionButton />

            <ConnectionsList />
            {/* <SmallButton
              onClick={() => {
                const event: ApiEvent = { type: "GetPaths" };
                window.electron.ipcRenderer.sendMessage('api', event);
                // const pulsarProcess = spawn(
                //   pulsarBin,
                //   ["standalone"],
                //   {
                //     env: {'JAVA_HOME': javaHome },
                //     stdio: "pipe"
                //   }
                // );
                // pulsarProcess.stdout.on("data", data => console.log(`[LOG][pulsar] ${data}`));
                // pulsarProcess.stderr.on("data", data => console.log(`[ERROR][pulsar] ${data}`));
              }}
              type='primary'
              text='Create a local Pulsar instance'
            /> */}
            {/* <SmallButton
              onClick={() => {
                // const pulsarProcess = spawn(
                //   dekafBin,
                //   [],
                //   {
                //     env: {
                //       'JAVA_HOME': javaHome,
                //       'DEKAF_LICENSE_ID': licenseId,
                //       'DEKAF_LICENSE_TOKEN': licenseToken,
                //       'DEKAF_DATA_DIR': path.join(pulsarInstancesDir, 'instance-1', 'dekaf-data')
                //     },
                //     stdio: "pipe"
                //   }
                // );
                // pulsarProcess.stdout.on("data", data => console.log(`[LOG][pulsar] ${data}`));
                // pulsarProcess.stderr.on("data", data => console.log(`[ERROR][pulsar] ${data}`));


                // setTimeout(() => {
                //   window.location.href="http://localhost:8090/"
                // }, 10_000);
              }}
              type='primary'
              text='Connect'
            /> */}
          </div>
        </Modals.DefaultProvider>
      </Notifications.DefaultProvider>
    </I18n.DefaultProvider>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InitialAppScreen />} />
      </Routes>
    </Router>
  );
}
