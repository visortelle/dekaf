import React from 'react';
import s from './TealTools.module.css'
import Logo from './Logo';

export type TealToolsProps = {};

const TealTools: React.FC<TealToolsProps> = (props) => {
  return (
    <div className={s.TealTools}>
      <div className={s.Text}>
        Pulsar X-Ray v0.1.0
      </div>
      <a href="https://teal.tools" target="__blank" className={s.Logo}>
        <Logo fontSize='18rem' isDark />
      </a>
    </div>
  );
}

export default TealTools;
