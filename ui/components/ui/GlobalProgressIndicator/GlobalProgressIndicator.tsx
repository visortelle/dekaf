import React from 'react';
import s from './GlobalProgressIndicator.module.css'
import * as AsyncTasks from '../../app/contexts/AsyncTasks';

const GlobalProgressIndicator: React.FC = () => {
  const { tasks } = AsyncTasks.useContext();

  const isRunning = Object.keys(tasks).length > 0;

  return isRunning ? (
    <div className={`${s.GlobalProgressIndicator}`}>
      <div className={s.Animation}></div>
    </div>
  ) : <></>;
}

export default GlobalProgressIndicator;
