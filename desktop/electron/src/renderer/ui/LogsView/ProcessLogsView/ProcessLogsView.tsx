import React, { useEffect, useState } from 'react';
import s from './ProcessLogsView.module.css'
import LogsView, { LogEntry } from '../LogsView';
import { logsChannel } from '../../../../main/channels';

export type ProcessLogsViewProps = {
  processId: string
};

const ProcessLogsView: React.FC<ProcessLogsViewProps> = (props) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    window.electron.ipcRenderer.on(logsChannel, (arg) => {
      // if (arg.type === "ProcessLogEntryReceived") {
      // }
      if (arg.type === "ProcessLogEntryReceived" && arg.processId === props.processId) {
        console.log('PP', arg);
        const logEntry: LogEntry = {
          content: arg.text,
          level: arg.channel === 'stderr' ? 'error' : 'info'
        }
        setLogs(v => v.concat([logEntry]));
      }
    });
  }, []);

  console.log('logs', logs, props.processId)

  return (
    <div className={s.ProcessLogsView}>
      <LogsView logs={logs} />
    </div>
  );
}

export default ProcessLogsView;
