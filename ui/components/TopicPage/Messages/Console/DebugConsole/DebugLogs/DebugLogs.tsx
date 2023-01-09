import React, { useCallback, useEffect, useRef } from 'react';
import { MessageDescriptor, SessionState } from '../../../types';
import s from './DebugLogs.module.css'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Input from '../../../../../ui/Input/Input';
import Highlighter from 'react-highlight-words';
import { useDebounce } from 'use-debounce';
import { DebugConsoleView } from '../types';
import Toolbar from '../Toolbar/Toolbar';
import { getLogColor, LogLevel, parseLogLine } from '../../logging/loggin';

export type DebugLogsProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState,
  view: DebugConsoleView,
  onSwitchView: (view: DebugConsoleView) => void,
  isVisible: boolean,
};

const displayLogEntriesRealTimeLimit = 250; // too many items leads to table blinking.

const DebugLogs: React.FC<DebugLogsProps> = (props) => {
  const scrollParentRef = useRef(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchQueryDebounced] = useDebounce(searchQuery, 400);

  const scrollToBottom = useCallback(() => virtuosoRef.current?.scrollToIndex({ index: props.messages.length - 1 }), [virtuosoRef.current]);

  useEffect(() => {
    if (props.sessionState === 'paused') {
      setTimeout(scrollToBottom, 250);
    }
  }, [props.sessionState]);

  let messagesWithLogs = props.messages.filter(message => message.debugStdout !== null && message.debugStdout.length > 0)

  if (props.sessionState === 'running') {
    messagesWithLogs = messagesWithLogs.slice(-displayLogEntriesRealTimeLimit);
  }

  if (!props.isVisible) {
    return <></>;
  }

  return (
    <div className={s.DebugLogs}>
      <Toolbar onSwitchView={props.onSwitchView} view={props.view}>
        <div className={s.SearchQueryInput}>
          <Input value={searchQuery} onChange={(v) => setSearchQuery(v)} placeholder="Search in logs" clearable />
        </div>
      </Toolbar>

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
              Message filters errors and console output will be shown here.<br /><br />
              Use the following functions to log messages:<br />
              <ul className={s.NoDataToShowFunctions}>
                <li className={s.NoDataToShowFunction}><code>log(a)</code></li>
                <li className={s.NoDataToShowFunction}><code>logInfo(a)</code></li>
                <li className={s.NoDataToShowFunction}><code>logWarn(a)</code></li>
                <li className={s.NoDataToShowFunction}><code>logError(a)</code></li>
                <li className={s.NoDataToShowFunction}>Use <code>logDebug(a)</code> to print the argument(s) as JSON.</li>
              </ul>
            </div>
          }}
          totalCount={messagesWithLogs.length}
          followOutput={props.sessionState === 'running'}
          atBottomThreshold={20}
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
  const logLines = props.messageLogs.map((log) => parseLogLine(log)).filter(([logLevel, logMessage]) => {
    return props.searchQuery.length === 0 || logMessage.includes(props.searchQuery)
  });

  return (
    <>
      {logLines.map(([logLevel, logMessage], i) => {
        return (
          <LogLine
            key={`${i}`}
            logLevel={logLevel}
            logMessage={logMessage}
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
  logLevel: LogLevel,
  logMessage: string,
  highlight: string[],
  message: MessageDescriptor,
  isShowMessageIndex: boolean
};
const LogLine: React.FC<LogLineProps> = (props) => {
  const color = getLogColor(props.logLevel);

  return (
    <div className={s.LogLine}>
      <div className={s.LogLineMessageIndex}>{props.isShowMessageIndex ? props.message.index : ''}</div>
      <div className={s.LogLineLevel} style={{ color }}>{props.logLevel === 'UNKNOWN' ? '' : props.logLevel}</div>
      <pre className={s.LogLineLogMessage} style={{ color }}>
        <Highlighter
          highlightClassName="highlight-substring"
          searchWords={props.highlight}
          autoEscape={true}
          textToHighlight={props.logMessage}
        />
      </pre>
    </div>
  );
}

export default DebugLogs;
