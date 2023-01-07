import React, { useCallback, useEffect, useRef } from 'react';
import { MessageDescriptor, SessionState } from '../../types';
import s from './DebugConsole.module.css'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Input from '../../../../ui/Input/Input';
import Highlighter from 'react-highlight-words';
import { useDebounce } from 'use-debounce';

export type DebugLogsProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState
};

const displayLogEntriesRealTimeLimit = 250; // too many items leads to table blinking.

const DebugLogs: React.FC<DebugLogsProps> = (props) => {
  const scrollParentRef = useRef(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchQueryDebounced] = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (props.sessionState === 'paused') {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: props.messages.length - 1 });
      }, 250);
    }
  }, [props.sessionState]);

  let messagesWithLogs = props.messages.filter(message => message.debugStdout !== null && message.debugStdout.length > 0)

  if (props.sessionState === 'running') {
    messagesWithLogs = messagesWithLogs.slice(-displayLogEntriesRealTimeLimit);
  }

  return (
    <div className={s.DebugConsole}>
      <div className={s.Toolbar}>
        <div className={s.SearchQueryInput}>
          <Input value={searchQuery} onChange={(v) => setSearchQuery(v)} placeholder="Search query" />
        </div>
      </div>

      <div className={s.Logs} ref={scrollParentRef}>
        <Virtuoso<MessageDescriptor>
          ref={virtuosoRef}
          itemContent={(i, message) => {
            const messageLogs = message.debugStdout?.trimEnd().split('\n') || [];
            return (
              <MessageLogs
                key={`${i}`}
                message={message}
                messageLogs={messageLogs}
                highlight={[searchQueryDebounced]}
                searchQuery={searchQueryDebounced}
              />
            );
          }}
          data={messagesWithLogs}
          customScrollParent={scrollParentRef.current || undefined}
          components={{
            EmptyPlaceholder: () => <div className={s.NoDataToShow} style={{ width: 'calc(100% - 24rem)' }}>
              Message filters errors and console output will be shown here.
            </div>
          }}
          totalCount={messagesWithLogs.length}
          followOutput={props.sessionState === 'running'}
        />
      </div>
    </div>
  );
}

type MessageLogsProps = {
  message: MessageDescriptor,
  messageLogs: string[],
  highlight: string[],
  searchQuery: string
};
const MessageLogs: React.FC<MessageLogsProps> = (props) => {
  const filter = useCallback(
    (line: string) => props.searchQuery.length === 0 || line.includes(props.searchQuery),
    [props.searchQuery]
  );

  return (
    <>
      {props.messageLogs.filter(filter).map((logLine, i) => {
        return (
          <LogLine
            key={`${i}`}
            logLine={logLine}
            highlight={props.highlight}
            message={props.message}
            isShowMessageIndex={i === 0}
          />
        );
      })}
    </>
  );
}

type LogLineProps = {
  logLine: string,
  highlight: string[],
  message: MessageDescriptor,
  isShowMessageIndex: boolean
};
const LogLine: React.FC<LogLineProps> = (props) => {
  let color = 'inherit';
  if (props.logLine.startsWith('[ERROR]')) {
    color = 'var(--accent-color-red)';
  } else if (props.logLine.startsWith('[WARN]')) {
    color = 'var(--accent-color-yellow)';
  } else if (props.logLine.startsWith('[INFO]')) {
    color = 'var(--accent-color-blue)';
  }

  return (
    <div className={s.LogLine}>
      <div className={s.LogLineMessageIndex}>{props.isShowMessageIndex ? props.message.index : ''}</div>
      <pre className={s.LogLineLogMessage} style={{ color }}>
        <Highlighter
          highlightClassName="highlight-substring"
          searchWords={props.highlight}
          autoEscape={true}
          textToHighlight={props.logLine}
        />
      </pre>
    </div>
  );
}

export default DebugLogs;
