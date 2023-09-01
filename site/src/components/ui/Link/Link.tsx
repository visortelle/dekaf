import React, { CSSProperties } from 'react';

import style from './Link.module.css';

type LinkProps = {
  href?: string;
  align?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
};

const Link: React.FC<LinkProps> = ({ href, align, children }) => {
  const aAlign = `align-${align}`;

  return (
    <a href={href} className={`${style.link} ${style[aAlign]}`}>
      {children}
    </a>
  );
};

export default Link;
