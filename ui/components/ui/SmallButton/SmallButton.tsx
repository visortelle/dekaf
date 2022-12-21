import React from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './SmallButton.module.css';

export type SmallButtonProps = {
  onClick: () => void,
  svgIcon?: string,
  text?: string,
  title?: string,
  type?: 'regular' | 'primary' | 'danger',
  disabled?: boolean,
  style?: React.CSSProperties,
  className?: string,
  testId?: string,
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
      className={`
        ${s.Button}
        ${props.disabled ? s.DisabledButton : ''}
        ${props.text ? '' : s.ButtonWithoutText}
        ${props.className || ''}
        `}
      onClick={props.onClick}
      style={{ backgroundColor, color: textColor, ...props.style }}
      disabled={props.disabled}
      title={props.title}
      data-testid={props.testId}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text && <div>{props.text}</div>}
    </button>
  );
}

export default SmallButton;
