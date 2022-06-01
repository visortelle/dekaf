import React from 'react';
import s from './Configuration.module.css'

export type ConfigurationProps = {};

const Configuration: React.FC<ConfigurationProps> = (props) => {
  return (
    <div className={s.Configuration}>
      Configuration
    </div>
  );
}

export default Configuration;
