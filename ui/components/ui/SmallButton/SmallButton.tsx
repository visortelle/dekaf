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
  testId?: string
}

const SmallButton = (props: SmallButtonProps) => {
  let typeClassName = '';
  switch (props.type) {
    case 'regular': typeClassName = s.Regular; break;
    case 'primary': typeClassName = s.Primary; break;
    case 'danger': typeClassName = s.Danger; break;
  }

  return (
    <button
      type="button"
      className={`
        ${s.Button}
        ${props.disabled ? s.DisabledButton : ''}
        ${props.text ? '' : s.ButtonWithoutText}
        ${props.className || ''}
        ${typeClassName}
        `}
      onClick={props.onClick}
      style={{ ...props.style }}
      disabled={props.disabled}
      title={props.title}
      data-testid={props.testId}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text && <span className={s.Text}>{props.text}</span>}
    </button>
  );
}

export default SmallButton;
