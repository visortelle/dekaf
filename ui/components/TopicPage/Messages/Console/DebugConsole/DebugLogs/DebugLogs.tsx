import React, { useCallback, useEffect, useRef } from 'react';
import { MessageDescriptor, SessionState } from '../../../types';
import s from './DebugLogs.module.css'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Input from '../../../../../ui/Input/Input';
import Highlighter from 'react-highlight-words';
import { useDebounce } from 'use-debounce';
import * as PulsarGrpcClient from '../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../../../app/contexts/Notifications';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import SmallButton from '../../../../../ui/SmallButton/SmallButton';
import { DebugConsoleView } from '../types';
import Toolbar from '../Toolbar/Toolbar';

export type DebugLogsProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState,
  consumerName: string,
  view: DebugConsoleView,
  onSwitchView: (view: DebugConsoleView) => void,
};

const displayLogEntriesRealTimeLimit = 250; // too many items leads to table blinking.

const DebugLogs: React.FC<DebugLogsProps> = (props) => {
  const scrollParentRef = useRef(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchQueryDebounced] = useDebounce(searchQuery, 400);
  const [code, setCode] = React.useState<string>('');
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

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
    <div className={s.DebugLogs}>
      <Toolbar onSwitchView={props.onSwitchView} view={props.view}>
        <div className={s.SearchQueryInput}>
          <Input value={searchQuery} onChange={(v) => setSearchQuery(v)} placeholder="Search in logs" clearable />
        </div>
        {/* <div className={s.SearchQueryInput} onKeyDown={(e) => {
          if (e.key === 'Enter') {

            const runCode = async () => {
              console.log('enter');
              e.stopPropagation();
              const req = new pb.RunCodeRequest();
              req.setCode(code);
              req.setConsumerName(props.consumerName);
              const res = await consumerServiceClient.runCode(req, {}).catch((e) => notifyError(e));
              if (res === undefined) {
                return;
              }
              if (res.getStatus()?.getCode() !== Code.OK) {
                notifyError(res.getStatus()?.getMessage());
              }

              console.log('result!', res.getResult()?.getValue());
            }

            runCode();
          }
        }}>
          <Input value={code} onChange={(v) => setCode(v)} placeholder="Run code" clearable />
        </div> */}
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
  let color = 'inherit';
  if (props.logLevel === 'ERROR') {
    color = 'var(--accent-color-red)';
  } else if (props.logLevel === 'WARN') {
    color = 'var(--accent-color-yellow)';
  } else if (props.logLevel === 'INFO') {
    color = 'var(--accent-color-blue)';
  }

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

const logLevels = ['LOG', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'UNKNOWN'] as const;
type LogLevel = typeof logLevels[number];

/* Takes log line. Returns log level and log message. */
function parseLogLine(line: string): [LogLevel, string] {
  const closingBracketIndex = line.indexOf(']');

  const rawLevel = line.slice(0, closingBracketIndex + 1).replace('[', '').replace(']', '');
  const logLevel: LogLevel = logLevels.find((l) => l === rawLevel) || 'UNKNOWN';

  const logMessage = line.slice(closingBracketIndex + 1).trim();


  return [logLevel, logMessage];
}

export default DebugLogs;
