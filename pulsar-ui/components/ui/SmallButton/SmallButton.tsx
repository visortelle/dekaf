import React, { MouseEventHandler } from 'react';
import SvgIcon from '../SvgIcon/SvgIcon';
import s from './SmallButton.module.css';

export type SmallButtonProps = {
  onClick: MouseEventHandler<HTMLDivElement>,
  svgIcon?: string,
  text?: string,
}

const SmallButton = (props: SmallButtonProps) => {
  return (
    <div
      className={`${s.Button} ${props.text ? '' : s.ButtonWithoutText}`}
      onClick={props.onClick}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text && <div>{props.text}</div>}
    </div>
  );
}

export default SmallButton;
