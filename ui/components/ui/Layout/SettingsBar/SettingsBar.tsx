import React from 'react';
import s from './SettingsBar.module.css'
import AuthButton from './AuthButton/AuthButton';

export type SettingsBarProps = {};

const SettingsBar: React.FC<SettingsBarProps> = (props) => {
  return (
    <div className={s.SettingsBar}>
      <AuthButton />
    </div>
  );
}

export default SettingsBar;

