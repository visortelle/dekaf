import React, { useEffect, useState } from 'react';
import s from './PulsarDistributionsEditor.module.css'

import PulsarVersionInfoElement from './PulsarVersionInfoElement/PulsarVersionInfoElement';
import { AnyPulsarVersion, ListPulsarDistributions } from '../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../main/channels';

export type PulsarDistributionsEditorProps = {

};

const PulsarDistributionsEditor: React.FC<PulsarDistributionsEditorProps> = (props) => {
  const [versions, setVersions] = useState<AnyPulsarVersion[]>([]);

  useEffect(() => {
    const listReq: ListPulsarDistributions = { type: "ListPulsarDistributions" };
    window.electron.ipcRenderer.sendMessage(apiChannel, listReq);

    window.electron.ipcRenderer.once('api', (arg) => {
      if (arg.type === "ListPulsarDistributionsResult") {
        setVersions(arg.versions || []);
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

export default PulsarDistributionsEditor;
