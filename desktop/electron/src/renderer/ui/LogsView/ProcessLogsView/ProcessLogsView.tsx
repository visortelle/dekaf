import React, { useEffect, useState } from 'react';
import s from './ProcessLogsView.module.css'
import LogsView, { LogEntry } from '../LogsView';
import { apiChannel, logsChannel } from '../../../../main/channels';
import { ResendProcessLogs } from '../../../../main/api/processes/type';
import { v4 as uuid } from 'uuid';

export type LogSource = {
  processId: string,
  name: string
};

export type ProcessLogsViewProps = {
  sources: LogSource[]
};

const maxEntries = 10_000;

const ProcessLogsView: React.FC<ProcessLogsViewProps> = (props) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const correlationId = uuid();

    props.sources.forEach(s => {
      const req: ResendProcessLogs = {
        type: 'ResendProcessLogs',
        correlationId,
        processId: s.processId
      };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    });

    window.electron.ipcRenderer.on(logsChannel, (arg) => {
      if (arg.type === "ResendProcessLogsResult" && arg.correlationId === correlationId) {
        setLogs(oldLogs => {
          const newEntries: LogEntry[] = arg.entries.map(entry => {
            const source = props.sources.find(s => s.processId === entry.processId)?.name || 'unknown';
            return {
              source,
              content: entry.content,
              epoch: entry.epoch
            }
          })
          return oldLogs.concat(newEntries).sort((a, b) => a.epoch - b.epoch).slice(-maxEntries);
        });
      }

      if (arg.type === "ProcessLogEntryReceived") {
        const source = props.sources.find(s => s.processId === arg.entry.processId);

        if (source === undefined) {
          return;
        }

        const logEntry: LogEntry = {
          source: source.name,
          content: arg.entry.content,
          epoch: arg.entry.epoch
        }
        setLogs(v => v.concat([logEntry]).slice(-maxEntries));
      }
    });
  }, []);

  return (
    <div className={s.ProcessLogsView} style={{ overflow: 'hidden', display: 'flex' }}>
      <LogsView logs={logs} />
    </div>
  );
}

export default ProcessLogsView;
