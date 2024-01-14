import React, { useEffect, useState } from 'react';
import s from './ConnectionList.module.css'
import { ListLocalPulsarInstances, LocalPulsarInstance } from '../../../../main/api/local-pulsar-instances/types';
import { apiChannel } from '../../../../main/channels';
import LocalPulsarInstanceElement from './LocalPulsarInstanceElement/LocalPulsarInstanceElement';
import { ListRemotePulsarConnections, RemotePulsarConnection } from '../../../../main/api/remote-pulsar-connections/types';
import RemotePulsarConnectionElement from './RemotePulsarConnectionElement/RemotePulsarConnectionElement';
import Input from '../../../ui/Input/Input';
import IconToggle from '../../../ui/IconToggle/IconToggle';
import CreateRemotePulsarConnectionButton from './CreateRemotePulsarConnectionButton/CreateRemotePulsarConnectionButton';
import CreateLocalPulsarInstanceButton from './CreateLocalPulsarInstanceButton/CreateLocalPulsarInstanceButton';

export type ConnectionListProps = {};

type SortBy = 'name' | 'last-used';

const ConnectionList: React.FC<ConnectionListProps> = (props) => {
  const [localPulsarInstances, setLocalPulsarInstances] = useState<LocalPulsarInstance[]>([]);
  const [remotePulsarConnections, setRemotePulsarConnections] = useState<RemotePulsarConnection[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('last-used')
  const [filter, setFilter] = useState('');

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

  const connectionsToShow = connections
    .filter(c => c.metadata.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'last-used') {
        return b.metadata.lastUsedAt - a.metadata.lastUsedAt
      } else if (sortBy === 'name') {
        return a.metadata.name.localeCompare(b.metadata.name, 'en', { numeric: true });
      }

      return 0;
    });

  return (
    <div className={s.ConnectionList}>
      <div style={{ padding: '12rem 18rem 8rem 18rem', display: 'flex', flexDirection: 'column', gap: '12rem', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <Input
            value={filter}
            onChange={setFilter}
            placeholder='Find connection by name'
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <IconToggle<SortBy>
              value={sortBy}
              onChange={setSortBy}
              items={[
                {
                  type: 'item',
                  value: 'last-used',
                  label: 'Sort by Last Used'
                },
                {
                  type: 'item',
                  value: 'name',
                  label: 'Sort by Name'
                }
              ]}
            />
          </div>
          <div>
            Shown <strong>{connectionsToShow.length}</strong> of <strong>{connections.length}</strong> connections
          </div>
        </div>
      </div>
      <div className={s.List}>
        {connectionsToShow.map(conn => {
          if (conn.type === "LocalPulsarInstance") {
            return <LocalPulsarInstanceElement key={conn.metadata.id} pulsarInstance={conn} />;
          } else if (conn.type === "RemotePulsarConnection") {
            return <RemotePulsarConnectionElement key={conn.metadata.id} connection={conn} />;
          }
        })}
      </div>
      <div style={{ marginTop: 'auto', padding: '12rem 18rem 24rem 18rem', display: 'grid', gap: '8rem', borderTop: '1px solid var(--border-color)' }}>
        <CreateRemotePulsarConnectionButton />
        <CreateLocalPulsarInstanceButton />
      </div>
    </div>
  );
}

export default ConnectionList;
