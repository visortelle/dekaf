import React from 'react';
import { MessageDescriptor, SessionState } from '../../types';
import s from './DebugConsole.module.css'
import DebugLogs from './DebugLogs/DebugLogs';
import ExpressionInspector from './ExpressionInspector/ExpressionInspector';
import { DebugConsoleView } from './types';

export type DebugConsoleProps = {
  messages: MessageDescriptor[],
  sessionState: SessionState,
  consumerName: string,
};

const DebugConsole: React.FC<DebugConsoleProps> = (props) => {
  const [view, setView] = React.useState<DebugConsoleView>('logs');

  return (
    <div className={s.DebugConsole}>
      {view === 'logs' && (
        <DebugLogs
          messages={props.messages}
          sessionState={props.sessionState}
          view={view}
          onSwitchView={(view) => setView(view)}
        />
      )}
      {view === 'expression-inspector' && (
        <ExpressionInspector view={view} onSwitchView={(view) => setView(view)} consumerName={props.consumerName} />
      )}
    </div>
  );
}

export default DebugConsole;
