import React from 'react';
import s from './TealTools.module.css'
import Logo from './Logo';

export type TealToolsProps = {};

const TealTools: React.FC<TealToolsProps> = (props) => {
  return (
    <div className={s.TealTools}>
      With love by&nbsp;<a href="https://teal.tools"><Logo fontSize='14rem' isDark/></a>
    </div>
  );
}

export default TealTools;
