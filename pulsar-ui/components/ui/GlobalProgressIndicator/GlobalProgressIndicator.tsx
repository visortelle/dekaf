import React from 'react';
import s from './GlobalProgressIndicator.module.css'
import * as AsyncTasks from '../../app/contexts/AsyncTasks';

const GlobalProgressIndicator: React.FC = () => {
  const { tasks } = AsyncTasks.useContext();

  const isRunning = Object.keys(tasks).length > 0;

  if (!isRunning) {
    return null;
  }

  return (
    <div className={`${s.GlobalProgressIndicator} ${isRunning ? s.Running : ''}`}></div>
  );
}

export default GlobalProgressIndicator;
