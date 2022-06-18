import React, { MouseEventHandler } from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './SmallButton.module.css';

export type SmallButtonProps = {
  onClick: () => void,
  svgIcon?: string,
  text?: string,
  type?: 'regular' | 'primary' | 'danger',
}

const SmallButton = (props: SmallButtonProps) => {
  let backgroundColor = '#fff';
  let textColor = 'var(--text-color)';
  switch (props.type) {
    case 'primary': backgroundColor = 'var(--accent-color-blue)'; textColor = '#fff'; break;
    case 'danger': backgroundColor = 'var(--accent-color-red)'; textColor = '#fff'; break;
  }

  return (
    <button
      type="button"
      className={`${s.Button} ${props.text ? '' : s.ButtonWithoutText}`}
      onClick={props.onClick}
      style={{ backgroundColor, color: textColor }}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text && <div>{props.text}</div>}
    </button>
  );
}

export default SmallButton;
