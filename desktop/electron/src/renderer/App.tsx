import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { getConfigDir, getDataDir } from '../api/get-paths';
import Button from './ui/Button/Button';
import '../../assets/globals.css';
import '../../assets/fonts.css';
import FormItem from './ui/FormItem/FormItem';
import FormLabel from './ui/FormLabel/FormLabel';
import { useState } from 'react';
import Input from './ui/Input/Input';
import useLocalStorage from "use-local-storage-state";
import { ApiEvent } from '../api/api-service';

window.electron.ipcRenderer.once('api', (arg) => {
  // eslint-disable-next-line no-console
  console.log('received event on client', arg);
});

function InitialAppScreen() {
  const [licenseId, setLicenseId] = useLocalStorage<string>('DEKAF_LICENSE_ID', { defaultValue: '' });
  const [licenseToken, setLicenseToken] = useLocalStorage<string>('DEKAF_LICENSE_TOKEN', { defaultValue: '' });

  return (
    <div>
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
          const event: ApiEvent = { type: "GetPathsRequest" };
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
