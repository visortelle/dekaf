import React, { useEffect, useState } from 'react';
import s from './ConnectionsList.module.css'
import { ListLocalPulsarInstances, LocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import { apiChannel } from '../../main/channels';
import LocalPulsarInstanceElement from './LocalPulsarInstanceElement/LocalPulsarInstanceElement';
import { ListRemotePulsarConnections, RemotePulsarConnection } from '../../main/api/remote-pulsar-connections/types';
import RemotePulsarConnectionElement from './RemotePulsarConnectionElement/RemotePulsarConnectionElement';

export type ConnectionsListProps = {};

const ConnectionsList: React.FC<ConnectionsListProps> = (props) => {
  const [localPulsarInstances, setLocalPulsarInstances] = useState<LocalPulsarInstance[]>([]);
  const [remotePulsarConnections, setRemotePulsarConnections] = useState<RemotePulsarConnection[]>([]);

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

    function refreshRemotePulsarConnections() {
      const req: ListRemotePulsarConnections = { type: "ListRemotePulsarConnections" };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    }

    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ListRemotePulsarConnectionsResult") {
        setRemotePulsarConnections(arg.configs);
      }

      const isRefreshRemotePulsarConnections =
        arg.type === "RemotePulsarConnectionCreated" ||
        arg.type === "RemotePulsarConnectionUpdated" ||
        arg.type === "RemotePulsarConnectionDeleted";

      if (isRefreshRemotePulsarConnections) {
        refreshRemotePulsarConnections();
      }
    });

    refreshLocalPulsarInstances();
    refreshRemotePulsarConnections();
  }, []);

  const connections = [...localPulsarInstances, ...remotePulsarConnections];

  const sortedConnections = connections.sort((a, b) => b.metadata.lastUsedAt - a.metadata.lastUsedAt);

  return (
    <div className={s.ConnectionsList}>
      {sortedConnections.map(conn => {
        if (conn.type === "LocalPulsarInstance") {
          return <LocalPulsarInstanceElement key={conn.metadata.id} pulsarInstance={conn} />;
        } else if (conn.type === "RemotePulsarConnection") {
          return <RemotePulsarConnectionElement key={conn.metadata.id} connection={conn} />;
        }
      })}
    </div>
  );
}

export default ConnectionsList;
