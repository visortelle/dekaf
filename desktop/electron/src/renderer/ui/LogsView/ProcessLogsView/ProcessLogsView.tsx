import React, { useCallback, useEffect, useState } from 'react';
import s from './ProcessLogsView.module.css'
import LogsView, { LogEntry } from '../LogsView';
import { apiChannel, logsChannel } from '../../../../main/channels';
import { ResendProcessLogs } from '../../../../main/api/processes/types';
import { v4 as uuid } from 'uuid';

export type LogSource = {
  processId: string,
  name: string
};

export type ProcessLogsViewProps = {
  logs: LogEntry[],
  onClear: () => void
};

const ProcessLogsView: React.FC<ProcessLogsViewProps> = (props) => {
  return (
    <div className={s.ProcessLogsView} style={{ overflow: 'hidden', display: 'flex' }}>
      <LogsView logs={props.logs} onClear={props.onClear} />
    </div>
  );
}

export default ProcessLogsView;
