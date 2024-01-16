import React, { useEffect, useRef, useState } from 'react';
import s from './ProcessLogsViewButton.module.css'
import * as Modals from '../../../app/Modals/Modals';
import SmallButton from '../../SmallButton/SmallButton';
import ProcessLogsView, { LogSource } from '../ProcessLogsView/ProcessLogsView';
import { LogEntry } from '../LogsView';
import { v4 as uuid } from 'uuid';
import { ResendProcessLogs } from '../../../../main/api/processes/types';
import { apiChannel, logsChannel } from '../../../../main/channels';

export type ProcessLogsViewButtonProps = {
  modalTitle?: string,
  disabled?: boolean,
  sources: LogSource[]
};

const maxEntries = 10_000;

const ProcessLogsViewButton: React.FC<ProcessLogsViewButtonProps> = (props) => {
  const modals = Modals.useContext();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sourcesRef = useRef(props.sources);

  // XXX - yes, there are lot of WTFs in this component. :)
  useEffect(() => {
    sourcesRef.current = props.sources;
  }, [props.sources]);

  useEffect(() => {
    const correlationId = uuid();

    sourcesRef.current.forEach(s => {
      const req: ResendProcessLogs = {
        type: 'ResendProcessLogs',
        correlationId,
        processId: s.processId
      };
      window.electron.ipcRenderer.sendMessage(apiChannel, req);
    });

    window.electron.ipcRenderer.on(logsChannel, (arg) => {
      if (arg.type === "ResendProcessLogsResult" && arg.correlationId === correlationId) {
        const sources = sourcesRef.current;

        setLogs(oldLogs => {
          const newEntries: LogEntry[] = arg.entries.map(entry => {
            const source = sources.find(s => s.processId === entry.processId)?.name || 'unknown';
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
        const sources = sourcesRef.current;

        const source = sources.find(s => s.processId === arg.entry.processId);

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
  }, [sourcesRef]);

  const modalId = 'process-logs';

  const logsView = <ProcessLogsView logs={logs} onClear={() => setLogs([])} />;

  const modal: Modals.ModalStackEntry = {
    id: modalId,
    title: props.modalTitle || 'Logs',
    content: (
      <div style={{ display: 'flex', maxWidth: 'calc(100vw - 48rem)' }}>
        {logsView}
      </div>
    ),
    styleMode: 'no-content-padding'
  }

  useEffect(() => {
    modals.update(modalId, modal);
  }, [logs]);

  return (
    <div className={s.ProcessLogsViewButton}>
      <SmallButton
        type='regular'
        text='Show Logs'
        disabled={props.disabled}
        onClick={() => modals.push(modal)}
      />
    </div>
  );
}

export default ProcessLogsViewButton;
