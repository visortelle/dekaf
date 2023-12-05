import React, { useEffect, useState } from 'react';
import s from './ConnectionsList.module.css'
import { ListLocalPulsarInstances, LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import { apiChannel } from '../../main/channels';
import LocalPulsarInstanceElement from './LocalPulsarInstanceElement/LocalPulsarInstanceElement';
import SmallButton from '../ui/SmallButton/SmallButton';

export type ConnectionsListProps = {};

const ConnectionsList: React.FC<ConnectionsListProps> = (props) => {
  const [localPulsarInstances, setLocalPulsarInstances] = useState<LocalPulsarInstance[]>([]);

  useEffect(() => {
    function refreshLocalPulsarInstances() {
      const req: ListLocalPulsarInstances = { type: "ListLocalPulsarInstances" };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    }

    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListLocalPulsarInstancesResult") {
        setLocalPulsarInstances(arg.configs);
      }

      const isRefreshLocalPulsarInstances =
        arg.type === "LocalPulsarInstanceCreated" ||
        arg.type === "LocalPulsarInstanceUpdated" ||
        arg.type === "LocalPulsarInstanceDeleted";

      if (isRefreshLocalPulsarInstances) {
        refreshLocalPulsarInstances();
      }
    });

    refreshLocalPulsarInstances();
  }, []);

  const sortedLocalPulsarInstances = localPulsarInstances.sort((a, b) => b.lastUsedAt - a.lastUsedAt);

  return (
    <div className={s.ConnectionsList}>
      {sortedLocalPulsarInstances.map(lpi => <LocalPulsarInstanceElement key={lpi.id} pulsarInstance={lpi} />)}
    </div>
  );
}

export default ConnectionsList;
