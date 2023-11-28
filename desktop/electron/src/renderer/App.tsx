import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Button from './ui/Button/Button';
import '../../assets/globals.css';
import '../../assets/fonts.css';
import FormItem from './ui/FormItem/FormItem';
import FormLabel from './ui/FormLabel/FormLabel';
import Input from './ui/Input/Input';
import useLocalStorage from "use-local-storage-state";
import { ApiEvent } from '../main/api/service';
import PulsarDistributionsPicker from './LocalPulsarConfigInput/PulsarDistributionPicker/PulsarDistributionPicker';
import * as I18n from './app/I18n/I18n';
import * as Notifications from './app/Notifications/Notifications';
import * as Modals from './app/Modals/Modals';
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from 'react';
import { LocalPulsarConfig } from '../main/api/local-pulsar/types';
import LocalPulsarConfigInput from './LocalPulsarConfigInput/LocalPulsarConfigInput';

// Debug
if (process.env.NODE_ENV === "development") {
  window.electron.ipcRenderer.on('api', (arg) => {
    console.debug('Received API event:', arg);
  });
}

function InitialAppScreen() {
  const [licenseId, setLicenseId] = useLocalStorage<string>('DEKAF_LICENSE_ID', { defaultValue: '' });
  const [licenseToken, setLicenseToken] = useLocalStorage<string>('DEKAF_LICENSE_TOKEN', { defaultValue: '' });
  const { notifyError } = Notifications.useContext();

  const [localPulsarConfig, setLocalPulsarConfig] = useState<LocalPulsarConfig>({
    name: 'new',
    version: '3.3.1'
  });

  useEffect(() => {
    window.electron.ipcRenderer.on('api', (arg) => {
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
            <LocalPulsarConfigInput
              value={localPulsarConfig}
              onChange={setLocalPulsarConfig}
            />
            <PulsarDistributionsPicker />
            <FormItem>
              <FormLabel content="License ID" />
              <Input
                value={licenseId}
                onChange={setLicenseId}
              />
            </FormItem>

            <FormItem>
              <FormLabel content="License Token" />
              <Input
                value={licenseToken}
                onChange={setLicenseToken}
                inputProps={{ type: 'password' }}
              />
            </FormItem>

            <Button
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
              text='Start local Pulsar instance'
            />
            <Button
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
            />
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
