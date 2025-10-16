import React, { MouseEventHandler, ReactElement } from 'react';

import SvgIcon from '../SvgIcon/SvgIcon';

import s from './SmallButton.module.css';
import { tooltipId } from '../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

export type SmallButtonProps = {
  onClick: MouseEventHandler<HTMLButtonElement>,
  svgIcon?: string,
  text?: string,
  title?: ReactElement | string,
  type?: 'regular' | 'primary' | 'danger',
  appearance?: 'regular' | 'borderless' | 'borderless-semitransparent',
  disabled?: boolean,
  style?: React.CSSProperties,
  className?: string,
  testId?: string,
}

const SmallButton = (props: SmallButtonProps) => {
  let typeClassName = '';
  switch (props.type) {
    case 'regular': typeClassName = s.Regular; break;
    case 'primary': typeClassName = s.Primary; break;
    case 'danger': typeClassName = s.Danger; break;
  }

  const isDisabled = props.disabled;

  return (
    <button
      type="button"
      className={`
        ${s.Button}
        ${isDisabled ? s.DisabledButton : ''}
        ${props.text ? '' : s.ButtonWithoutText}
        ${props.appearance === 'borderless' ? s.Borderless : ''}
        ${props.appearance === 'borderless-semitransparent' ? s.BorderlessSemitransparent : ''}
        ${props.className || ''}
        ${typeClassName}
        `}
      onClick={props.onClick}
      style={{ ...props.style }}
      disabled={isDisabled}
      data-testid={props.testId}
      data-tooltip-id={tooltipId}
      data-tooltip-html={renderToStaticMarkup(<>{props.title}</>)}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text && <span className={s.Text}>{props.text}</span>}
    </button>
  );
}

export default SmallButton;
