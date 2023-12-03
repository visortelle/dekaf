import React from 'react';
import s from './LogsView.module.css'

export type LogEntry = {
  level: 'info' | 'error',
  content: string
};

export type LogsViewProps = {
  logs: LogEntry[]
};

const LogsView: React.FC<LogsViewProps> = (props) => {
  return (
    <div className={s.LogsView}>
      {props.logs.map(l => <div>{l.content}</div>)}
    </div>
  );
}

export default LogsView;
