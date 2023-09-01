import React, { MouseEventHandler } from 'react';

import style from './Button.module.css';

type ButtonProps = {
  href?: string;
  size?: 'small' | 'normal';
  title?: string;
  variant?: 'primary' | 'secondary';
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

const Button: React.FC<ButtonProps> = ({
  href,
  size,
  title,
  variant,
  onClick,
}) => {
  const className = `${style.button} ${
    !variant || variant === 'primary'
      ? style.buttonPrimary
      : style.buttonSecondary
  } ${size === 'small' ? style.sizeSmall : ''}`;

  return href ? (
    <a className={className} href={href}>
      {title || ''}
    </a>
  ) : (
    <button className={className} onClick={onClick}>
      {title || ''}
    </button>
  );
};

export default Button;
