import React, { useEffect, useState } from 'react';
import s from './ProcessStatusIndicator.module.css'
import { GetActiveProcesses, ProcessStatus } from '../../../../main/api/processes/types';
import { apiChannel } from '../../../../main/channels';

export type ProcessStatusIndicatorProps = {
  processId?: string,
  onStatusChange?: (status: ProcessStatus) => void
};

type Color = string;
const palette: Record<ProcessStatus, Color> = {
  unknown: 'var(--border-color)',
  starting: 'var(--accent-color-yellow)',
  alive: 'var(--accent-color-yellow)',
  failed: 'var(--accent-color-red)',
  ready: 'var(--accent-color-green)',
  stopping: 'var(--accent-color-yellow)'
};

const ProcessStatusIndicator: React.FC<ProcessStatusIndicatorProps> = (props) => {
  const [status, _setStatus] = useState<ProcessStatus>('unknown');

  const setStatus = (status: ProcessStatus) => {
    _setStatus(status);

    if (props.onStatusChange !== undefined) {
      props.onStatusChange(status);
    }
  }

  useEffect(() => {
    if (props.processId === undefined) {
      return;
    }

    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ProcessStatusUpdated" && arg.processId === props.processId) {
        setStatus(arg.status);
      }

      if (arg.type === "GetActiveProcessesResult") {
        const maybeProc = Object.entries(arg.processes).find(([processId]) => processId === props.processId)
        if (maybeProc === undefined) {
          setStatus('unknown');
          return;
        }

        setStatus(maybeProc[1].status);
      }
    });

    const req: GetActiveProcesses = { type: "GetActiveProcesses" };
    window.electron.ipcRenderer.sendMessage(apiChannel, req);
  }, [props.processId]);

  return (
    <div
      className={s.ProcessStatusIndicator}
      style={{ background: palette[status] }}
    >
    </div>
  );
}

export default ProcessStatusIndicator;
