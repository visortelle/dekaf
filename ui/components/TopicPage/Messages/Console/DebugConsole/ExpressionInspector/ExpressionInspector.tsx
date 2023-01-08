import React from 'react';
import Toolbar from '../Toolbar/Toolbar';
import { DebugConsoleView } from '../types';
import s from './ExpressionInspector.module.css'

export type ExpressionInspectorProps = {
  view: DebugConsoleView,
  onSwitchView: (view: DebugConsoleView) => void,
};

const ExpressionInspector: React.FC<ExpressionInspectorProps> = (props) => {
  return (
    <div className={s.ExpressionInspector}>
      <Toolbar onSwitchView={props.onSwitchView} view={props.view}>

      </Toolbar>
      inspector
    </div>
  );
}

export default ExpressionInspector;
