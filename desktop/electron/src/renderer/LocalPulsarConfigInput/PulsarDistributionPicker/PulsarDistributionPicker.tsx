import React, { useEffect, useState } from 'react';
import s from './PulsarDistributionsPicker.module.css'

import PulsarVersionInfoElement from './PulsarVersionInfoElement/PulsarVersionInfoElement';
import { AnyPulsarVersion, ListPulsarDistributions } from '../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../main/channels';

export type PulsarDistributionsPickerProps = {

};

const PulsarDistributionsPicker: React.FC<PulsarDistributionsPickerProps> = (props) => {
  const [versions, setVersions] = useState<AnyPulsarVersion[]>([]);

  useEffect(() => {
    const refreshPulsarDistributionsList = () => {
      const req: ListPulsarDistributions = { type: "ListPulsarDistributions" };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    }

    window.electron.ipcRenderer.on('api', (arg) => {
      switch (arg.type) {
        case "ListPulsarDistributionsResult": {
          setVersions(arg.versions?.sort((a, b) => b.localeCompare(a, 'en', { numeric: true })) || []);
          break;
        }
        case "PulsarDistributionDeleted": {
          refreshPulsarDistributionsList();
        }
      }
    });

    refreshPulsarDistributionsList();
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
