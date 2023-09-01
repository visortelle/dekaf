import React from 'react';

import style from './Heading.module.css';

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  align?: 'left' | 'center' | 'right';
  colored?: boolean;
  children?: React.ReactNode;
};

const Heading: React.FC<HeadingProps> = ({
  level = 1,
  align,
  colored,
  children,
}) => {
  const HLevelTag: keyof JSX.IntrinsicElements = `h${level}`;

  const hLevel = `level-${level}`;
  const hAlign = `align-${align}`;

  return (
    <HLevelTag
      className={`${style.heading} ${style[hLevel]} ${style[hAlign]} ${
        colored ? style.headingColored : ''
      }`}
    >
      {children}
    </HLevelTag>
  );
};

export default Heading;
