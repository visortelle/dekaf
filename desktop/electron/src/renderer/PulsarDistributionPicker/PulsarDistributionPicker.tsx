import React, { useEffect, useState } from 'react';
import s from './PulsarDistributionsPicker.module.css'

import PulsarVersionInfoElement from './PulsarVersionInfoElement/PulsarVersionInfoElement';
import { AnyPulsarVersion, ListPulsarDistributions } from '../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../main/channels';

export type PulsarDistributionsPickerProps = {

};

const PulsarDistributionsPicker: React.FC<PulsarDistributionsPickerProps> = (props) => {
  const [versions, setVersions] = useState<AnyPulsarVersion[]>([]);

  useEffect(() => {
    const listReq: ListPulsarDistributions = { type: "ListPulsarDistributions" };
    window.electron.ipcRenderer.sendMessage(apiChannel, listReq);

    window.electron.ipcRenderer.on('api', (arg) => {
      if (arg.type === "ListPulsarDistributionsResult") {
        setVersions(arg.versions?.sort((a, b) => b.localeCompare(a, 'en', { numeric: true })) || []);
      }
    });
  }, []);

  return (

    <div className={s.PulsarDistributionsEditor}>
      {versions.map(version => (
        <PulsarVersionInfoElement key={version} version={version} />
      ))}
    </div>
  );
}

export default PulsarDistributionsPicker;
