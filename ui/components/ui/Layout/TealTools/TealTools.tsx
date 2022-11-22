import React from 'react';
import s from './TealTools.module.css'
import Logo from './Logo';

export type TealToolsProps = {};

const TealTools: React.FC<TealToolsProps> = (props) => {
  return (
    <div className={s.TealTools}>
      <div className={s.Text}>
        Teal Tool for Apache Pulsar v1.0.0-beta-1
      </div>
      <div className={s.Links}>
        <a href="#" target="__blank" className={`A ${s.Link}`}>
          Report a problem
        </a>
        <a href="#" target="__blank" className={`A ${s.Link}`}>
          Register license
        </a>
        <a href="#" target="__blank" className={`A ${s.Link}`}>
          Get help
        </a>
      </div>
      <a href="https://teal.tools" target="__blank" className={s.Logo}>
        <Logo fontSize='18rem' isDark />
      </a>
    </div>
  );
}

export default TealTools;
