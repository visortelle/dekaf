import React, { useEffect, useState } from 'react';
import s from './ProcessStatusIndicator.module.css'
import { GetActiveProcesses, ProcessStatus } from '../../../../main/api/processes/types';
import { apiChannel } from '../../../../main/channels';

export type ProcessStatusIndicatorProps = {
  processId?: string
};

type Color = string;
const palette: Record<ProcessStatus, Color> = {
  unknown: 'var(--surface-color)',
  alive: 'var(--accent-color-yellow)',
  failed: 'var(--accent-color-red)',
  ready: 'var(--accent-color-green)',
};

const ProcessStatusIndicator: React.FC<ProcessStatusIndicatorProps> = (props) => {
  const [status, setStatus] = useState<ProcessStatus>('unknown');

  useEffect(() => {
    if (props.processId === undefined) {
      return;
    }

    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ProcessStatusUpdated" && arg.processId === props.processId) {
        setStatus(arg.status);
      }

      if (arg.type === "GetActiveProcessesResult") {
        Object.entries(arg.processes).forEach(([processId, proc]) => {
          if (processId === props.processId) {
            setStatus(proc.status);
          }
        });
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
