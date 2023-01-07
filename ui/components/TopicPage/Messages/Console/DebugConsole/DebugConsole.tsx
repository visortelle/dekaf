import React, { useEffect, useRef } from 'react';
import { MessageDescriptor, SessionState } from '../../types';
import s from './DebugConsole.module.css'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Input from '../../../../ui/Input/Input';

export type DebugLogsProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState
};

const displayLogEntriesRealTimeLimit = 250; // too many items leads to table blinking.

const DebugLogs: React.FC<DebugLogsProps> = (props) => {
  const scrollParentRef = useRef(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  useEffect(() => {
    if (props.sessionState === 'paused') {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: props.messages.length - 1 });
      }, 250);
    }
  }, [props.sessionState]);

  let messagesWithLogs = props.messages.filter(message => message.debugStdout !== null && message.debugStdout.length > 0);
  if (props.sessionState === 'running') {
    messagesWithLogs = messagesWithLogs.slice(-displayLogEntriesRealTimeLimit);
  }

  return (
    <div className={s.DebugConsole}>
      <div className={s.Toolbar}>
        <Input value='' onChange={() => { }} />
      </div>

      <div className={s.Logs} ref={scrollParentRef}>
        <Virtuoso<MessageDescriptor>
          ref={virtuosoRef}
          itemContent={(i, message) => {
            return message.debugStdout
              ?.trimEnd()
              .split('\n')
              .map((logLine, k) => <LogEntry key={`${i}-${k}`} message={message} logLine={logLine} />);
          }}
          data={messagesWithLogs}
          customScrollParent={scrollParentRef.current || undefined}
          components={{
            EmptyPlaceholder: () => <div className={s.NoDataToShow} style={{ width: 'calc(100% - 24rem)' }}>
              Message filters errors and console output will be shown here.
            </div>
          }}
          increaseViewportBy={{ top: window.innerHeight / 2, bottom: window.innerHeight / 2 }}
          totalCount={messagesWithLogs.length}
          followOutput={true}
        />
      </div>
    </div>
  );
}

type LogEntryProps = {
  message: MessageDescriptor,
  logLine: string
};
const LogEntry: React.FC<LogEntryProps> = (props) => {
  let color = 'inherit';
  if (props.logLine.startsWith('[ERROR]')) {
    color = 'var(--accent-color-red)';
  } else if (props.logLine.startsWith('[WARN]')) {
    color = 'var(--accent-color-yellow)';
  } else if (props.logLine.startsWith('[INFO]')) {
    color = 'var(--accent-color-blue)';
  }

  return (
    <div className={s.LogEntry}>
      <div className={s.LogEntryMessageIndex}>{props.message.index}</div>
      <pre className={s.LogEntryLogMessage} style={{ color }}>{props.logLine}</pre>
    </div>
  );
}

export default DebugLogs;
