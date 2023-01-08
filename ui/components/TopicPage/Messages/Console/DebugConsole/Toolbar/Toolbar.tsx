import React from 'react';
import { DebugConsoleView } from '../types';
import s from './Toolbar.module.css'

export type ToolbarProps = {
  children: React.ReactNode,
  view: DebugConsoleView,
  onSwitchView: (view: DebugConsoleView) => void,
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  return (
    <div className={s.Toolbar}>
      <div className={s.Children}>
        {props.children}
      </div>

      <div className={s.Tabs}>
        <Tab
          onClick={() => props.onSwitchView('logs')}
          title="Logs"
          isActive={props.view === 'logs'}
        />
        <Tab
          onClick={() => props.onSwitchView('expression-inspector')}
          title="Expression Inspector"
          isActive={props.view === 'expression-inspector'}
        />
      </div>
    </div>
  );
}

type TabProps = {
  title: string,
  onClick: () => void,
  isActive?: boolean,
}
const Tab: React.FC<TabProps> = (props) => {
  return (
    <div
      className={`${s.Tab} ${props.isActive ? s.ActiveTab : ''}`}
      onClick={props.onClick}
    >
      {props.title}
    </div>
  );
}

export default Toolbar;
