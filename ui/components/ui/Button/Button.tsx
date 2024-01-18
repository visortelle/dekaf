import SvgIcon from '../SvgIcon/SvgIcon';
import s from './Button.module.css';
import React, {ReactElement} from "react";
import premiumIcon from "./premium.svg";
import { tooltipId } from '../Tooltip/Tooltip';
import {renderToStaticMarkup} from "react-dom/server";

export type ButtonProps = {
  onClick: () => void,
  text?: string
  svgIcon?: string,
  title?: string,
  type: 'primary' | 'regular' | 'danger',
  testId?: string,
  size?: 'regular' | 'small',
  disabled?: boolean,
  active?: boolean,
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>,
  isPremiumFeature?: boolean,
  premiumFeatureTitle?: ReactElement | string
}
const Button: React.FC<ButtonProps> = (props) => {
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
        ${props.active ? s.ActiveButton : ''}
        ${props.text ? '' : s.ButtonWithoutText}
        ${props.size === 'small' ? s.SmallSize : ''}
        ${typeClassName}
      `}
      onClick={props.onClick}
      disabled={isDisabled}
      title={props.title}
      data-testid={props.testId}
      data-tooltip-id={tooltipId}
      data-tooltip-html={renderToStaticMarkup(<>{props.isPremiumFeature ? props.premiumFeatureTitle : props.title}</>)}
      {...props.buttonProps}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text}
      {props.isPremiumFeature && <div className={s.PremiumFeature}><SvgIcon svg={premiumIcon} /></div>}
    </button>
  );
}

export default Button;
