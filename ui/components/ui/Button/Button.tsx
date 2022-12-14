import SvgIcon from '../SvgIcon/SvgIcon';
import s from './Button.module.css';

export type ButtonProps = {
  onClick: () => void,
  text?: string
  svgIcon?: string,
  title?: string,
  type: 'primary' | 'regular' | 'danger',
  testId?: string,
  size?: 'regular' | 'small',
  disabled?: boolean,
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>,
}
const Button: React.FC<ButtonProps> = (props) => {
  let className = '';
  switch (props.type) {
    case 'regular': className = s.Regular; break;
    case 'primary': className = s.Primary; break;
    case 'danger': className = s.Danger; break;
  }

  switch (props.size) {
    case 'small': className += ` ${s.SmallSize}`; break;
  }

  return (
    <button
      type="button"
      className={`${s.Button} ${props.disabled ? s.DisabledButton : ''} ${props.text ? '' : s.ButtonWithoutText} ${className}`}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      data-testid={props.testId}
      {...props.buttonProps}
    >
      {props.svgIcon && <SvgIcon svg={props.svgIcon} />}
      {props.text}
    </button>
  );
}

export default Button;
