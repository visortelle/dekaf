import React from 'react';
import s from './SettingsBar.module.css'
import Button from '../../../app/pulsar-auth/Button/Button';

export type SettingsBarProps = {};

const SettingsBar: React.FC<SettingsBarProps> = (props) => {
  return (
    <div className={s.SettingsBar}>
      <Button />
    </div>
  );
}

export default SettingsBar;

