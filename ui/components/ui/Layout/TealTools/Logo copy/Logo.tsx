import React from 'react';
import s from './Logo.module.css';

const Logo = (props: { fontSize: string, isDark?: boolean, isCompact?: boolean }) => {
  return (
    <div
      className={s.Logo}
      style={{
        fontSize: props.fontSize,
        color: props.isDark ? '#fff' : 'var(--text-color)'
      }}
    >
      <span style={{ color: 'var(--teal-color)' }}>{props.isCompact ? 't' : 'teal.'}</span><span>{props.isCompact ? 't' : 'tools'}</span>
    </div>
  );
};

export default Logo;
