import React, { useEffect, useState } from 'react';
import s from './ConnectionsList.module.css'
import { ListLocalPulsarInstances, LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import { apiChannel } from '../../main/channels';
import LocalPulsarInstanceElement from './LocalPulsarInstanceElement/LocalPulsarInstanceElement';

export type ConnectionsListProps = {};

const ConnectionsList: React.FC<ConnectionsListProps> = (props) => {
  const [localPulsarInstances, setLocalPulsarInstances] = useState<LocalPulsarInstance[]>([]);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListLocalPulsarInstancesResult") {
        setLocalPulsarInstances(arg.configs);
      }
    });

    function refreshLocalPulsarInstances() {
      console.log('list');
      const req: ListLocalPulsarInstances = { type: "ListLocalPulsarInstances" };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    }

    refreshLocalPulsarInstances();
  }, []);

  return (
    <div className={s.ConnectionsList}>
      {localPulsarInstances.map(lpi => <LocalPulsarInstanceElement key={lpi.id} value={lpi} />)}
    </div>
  );
}

export default ConnectionsList;
