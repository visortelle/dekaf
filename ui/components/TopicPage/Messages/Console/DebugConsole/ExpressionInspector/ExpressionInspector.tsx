import React, { useCallback, useEffect } from 'react';
import Toolbar from '../Toolbar/Toolbar';
import { DebugConsoleView } from '../types';
import s from './ExpressionInspector.module.css'
import * as PulsarGrpcClient from '../../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../../../app/contexts/Notifications';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import Button from '../../../../../ui/Button/Button';
import CodeEditor from '../../../../../ui/CodeEditor/CodeEditor';
import runIcon from './run.svg';
import clearIcon from './clear.svg';
import { getLogColor, parseLogLine } from '../../logging/loggin';
import { SessionState } from '../../../types';

export type ExpressionInspectorProps = {
  consumerName: string,
  sessionState: SessionState,
  view: DebugConsoleView,
  onSwitchView: (view: DebugConsoleView) => void,
  isVisible: boolean,
};

const ExpressionInspector: React.FC<ExpressionInspectorProps> = (props) => {
  const [code, setCode] = React.useState<string>('');
  const { consumerServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [logs, setLogs] = React.useState<string[]>([]);
  const logEntriesRef = React.useRef<HTMLDivElement>(null);
  const [isConsumerCreated, setIsConsumerCreated] = React.useState<boolean>(false);

  useEffect(() => {
    if (!isConsumerCreated && props.sessionState === 'running') {
      setIsConsumerCreated(true);
    }
  }, [props.sessionState, isConsumerCreated]);

  const runCode = async () => {
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

    const result = res.getResult()?.getValue();

    if (result === undefined) {
      return;
    }

    setLogs((logs) => logs.concat([result]));
    setTimeout(() => logEntriesRef.current?.scrollTo(0, logEntriesRef.current.scrollHeight), 0);
  }

  if (!props.isVisible) {
    return <></>;
  }

  return (
    <div
      className={s.ExpressionInspector}
      onKeyDown={e => {
        if (e.ctrlKey && e.key === 'Enter') {
          runCode();
        }
      }}
    >
      <Toolbar onSwitchView={props.onSwitchView} view={props.view}>
        <div>
          Run any JavaScript expression in the context of the session. Try <code>jsLibs</code> <code>2 + 2</code> or <code>lastMessage</code>.
        </div>
        {!isConsumerCreated && (
          <div style={{ color: 'var(--accent-color-red)' }}>
            You should first initiate the session to be able run any expression.
          </div>
        )}
      </Toolbar>

      <div className={s.Inspector}>
        <div className={s.CodeEditor}>
          <CodeEditor
            language='javascript'
            height="100%"
            width="100%"
            value={code}
            onChange={(v) => setCode(v || '')}
          />
        </div>

        <div className={s.Logs}>
          <div className={s.ClearLogsButton}>
            <Button
              type="danger"
              svgIcon={clearIcon}
              onClick={() => setLogs([])}
              disabled={logs.length === 0}
            />
          </div>

          <div className={s.LogEntries} ref={logEntriesRef}>
            {logs.map((r, i) => {
              const [level, message] = parseLogLine(r);
              const color = getLogColor(level);

              return (
                <div key={i} className={s.LogEntry} style={{ color }}>
                  {message.trim().split('\n').map((line, k) => (
                    <pre key={`${k}`} className={s.LogEntryLine}>{line}</pre>
                  ))}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      <div className={s.Toolbar}>
        <div className={s.ToolbarControl}>
          <Button
            text='Run'
            type='primary'
            size='small'
            svgIcon={runIcon}
            onClick={runCode}
            disabled={!isConsumerCreated}
          />
        </div>
      </div>
    </div>
  );
}

export default ExpressionInspector;
