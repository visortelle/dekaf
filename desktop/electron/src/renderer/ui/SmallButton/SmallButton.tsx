import React, { MouseEventHandler, ReactElement } from 'react';

import SvgIcon from '../SvgIcon/SvgIcon';

import s from './SmallButton.module.css';
import { tooltipId } from '../Tooltip/Tooltip';
import { renderToStaticMarkup } from 'react-dom/server';
import premiumIcon from './premium.svg';

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
  isPremiumFeature?: boolean,
  premiumFeatureTitle?: ReactElement | string
}

const SmallButton = (props: SmallButtonProps) => {
  let typeClassName = '';
  switch (props.type) {
    case 'regular': typeClassName = s.Regular; break;
    case 'primary': typeClassName = s.Primary; break;
    case 'danger': typeClassName = s.Danger; break;
  }

  const isDisabled = props.disabled || props.isPremiumFeature;

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
      data-tooltip-html={renderToStaticMarkup(<>{props.isPremiumFeature ? props.premiumFeatureTitle : props.title}</>)}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text && <span className={s.Text}>{props.text}</span>}
      {props.isPremiumFeature && <div className={s.PremiumFeature}><SvgIcon svg={premiumIcon} /></div>}
    </button>
  );
}

export default SmallButton;
